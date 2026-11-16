import Check from "@mui/icons-material/Check";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import MonetizationOnRounded from "@mui/icons-material/MonetizationOnRounded";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { use, useMemo, useState } from "react";
import Swal from "sweetalert2";
import _ from "lodash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentFeeForStudent, postCurrentFee } from "@/api/currentFeeAPI";
import { currencyOrDash } from "@/config/currencyFormatter";
import QueryError from "@/components/QueryError";
import { thrownMessage } from "@/lib/formErrors";
import { checkAmount, exceedsOutstanding, overpaymentMessage, paymentBlocker } from "./paymentRules";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomTitle from "@/components/custom/CustomTitle";
import { EMPTY_IMAGES } from "@/config/images";
import { MonetizationOn, Person2Sharp } from "@mui/icons-material";
import useLevelById from "@/components/hooks/useLevelById";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import {  MenuItem, useMediaQuery, useTheme } from "@mui/material";
import useLevel from "@/components/hooks/useLevel";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "@/components/inputs/Input";
import FeesDetailsSkeleton from "@/components/skeleton/FeesDetailsSkeleton";
import PayeeDetails from "./PayeeDetails";
import SelectInput from "@/components/inputs/SelectInput";

const schema = yup.object().shape({
  // _id: yup.string().required("ID is required"),
  level: yup.object().shape({
    levelId: yup.string().required("Level ID is required"),
    levelName: yup.string().required("Level Name is required"),
  }),
  student: yup.object().shape({
    _id: yup.string().required("Student ID is required"),
    fullName: yup.string().required("Full Name is required"),
  }),
  paymentMethod: yup.string().required("Required*"),
  amount: yup
    .string()
    .test("amount", "Enter a valid amount", function (value) {
      const result = checkAmount(value);
      return result.ok || this.createError({ message: result.message });
    }),
  payee: yup.object().shape({
    name: yup.string().required("Full Name is required"),
    phonenumber: yup
      .string()
      .matches(/^(\+\d{1,3})?\(?\d{3}\)?\d{3}\d{4}$/, "Invalid Phone number"),
  }),
});

const FeeMakePayment = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchParams, setSearchParams] = useSearchParams();
  const { fees, levelLoading: feesLoading } = useLevel();
  const { session } = use(UserContext);
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [showPayeeDetails, setShowPayeeDetails] = useState(false);

  const {
    control,
    watch,
    setValue,
    trigger,
    getValues,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      level: {
        levelId: searchParams.get("level_id") || "",
        levelName: searchParams.get("level_name") || "",
      },
      student: {
        _id: "",
        fullName: "",
        profile: "",
      },
      amount: "",
      paymentMethod: "Cash",
    },
  });

  const currentLevel = watch("level");
  const studentInfo = watch("student");

  ///Get Student fees info
  const studentFees = useQuery({
    queryKey: ["student-fees", studentInfo?._id, searchParams.get("level_id")],
    queryFn: () =>
      getCurrentFeeForStudent({
        session: session?.sessionId,
        term: session?.termId,
        student: studentInfo?._id,
        level: searchParams.get("level_id"),
      }),

    enabled: !!studentInfo?._id && !!searchParams.get("level_id"),
  });
  // Undefined until the server has answered; never a stand-in set of zeros (zeros would
  // look like "fully paid" if the request failed).
  const feeInfo = studentFees.data;
  const blocker = paymentBlocker({
    studentId: studentInfo?._id,
    fees: feeInfo,
    loading: studentFees.isFetching,
    failed: studentFees.isError,
  });

  const { students, levelLoading } = useLevelById(currentLevel?.levelId);

  const currentFees = useMemo(() => {
    const selectedFee = fees?.find(
      (fee) => fee?.levelId === searchParams.get("level_id")
    );
    return selectedFee?.fees || 0;
  }, [searchParams.get("level_id")]);

  const handleOpenPayee = async () => {
    if (blocker) return;
    // Check the amount now, so the payer's details are only asked for a valid payment.
    if (!(await trigger("amount"))) return;
    const { amount } = checkAmount(getValues("amount"));
    if (exceedsOutstanding(amount, feeInfo?.totalOutstanding)) {
      setError("amount", { type: "custom", message: overpaymentMessage(feeInfo?.totalOutstanding) });
      return;
    }
    setShowPayeeDetails(true);
  };

  //Add fees to database
  const { mutate, isPending } = useMutation({
    mutationFn: postCurrentFee,
  });

  function onSubmit(values) {
    if (isPending || blocker) return;
    const { amount } = checkAmount(values.amount);
    const owed = Number(feeInfo?.totalOutstanding);
    if (exceedsOutstanding(amount, owed)) {
      setShowPayeeDetails(false);
      setError("amount", { type: "custom", message: overpaymentMessage(owed) });
      return;
    }
    // The balance after this payment is worked out and stored by the server.
    const payment = {
      _id: feeInfo?.current?._id,
      payment: {
        paid: amount,
        paymentMethod: values?.paymentMethod,
        payer: values.payee,
      },
    };
    Swal.fire({
      title: "Record this payment?",
      text:
        `${currencyOrDash(amount)} from ${values.payee?.name || "the payer"} for ${studentInfo?.fullName}.`,
      showCancelButton: true,
      confirmButtonText: "Record payment",
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      mutate(payment, {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["student-fees"] });
          queryClient.invalidateQueries({ queryKey: ["current-fees-summary"] });
          queryClient.invalidateQueries({ queryKey: ["fees-for-day"] });
        },
        onSuccess: (recorded) => {
          schoolSessionDispatch(alertSuccess("Payment recorded"));
          // The receipt has its own address (its number), so it can be reopened later.
          navigate(`/fee/receipt/${encodeURIComponent(recorded.id)}`, {
            state: {
              fee: {
                ...recorded,
                fee: recorded.termFees ?? feeInfo?.current?.fees,
                arreas: recorded.arrears ?? feeInfo?.previous?.remaining,
                feePaid: recorded.paidBefore ?? feeInfo?.current?.paid,
                paidThisTerm: recorded.paidThisTerm,
                studentName: studentInfo?.fullName,
                levelName: currentLevel?.levelName,
              },
            },
          });
          setShowPayeeDetails(false);
          reset();
        },
        // The payment was NOT recorded: say why, and keep the form so nothing is retyped.
        onError: (error) => {
          setShowPayeeDetails(false);
          schoolSessionDispatch(alertError(thrownMessage(error, "The payment was not recorded. Please try again.")));
        },
      });
    });
  }

  //View Student Current fee info
  const handleViewStudentFeeHistory = () => {
    navigate(
      `/fee/payment/${studentInfo?.fullName}?level_id=${searchParams.get(
        "level_id"
      )}&_id=${studentInfo?._id}`,
      {
        state: {
          prevPath: `/fee/payment?level_id=${searchParams.get(
            "level_id"
          )}&level_name=${searchParams.get("level_name")}`,
        },
      }
    );
  };

  //View Fees History
  const handleOpenPaymentHistory = () => navigate("/fee/history");

  return (
    <>
      <CustomTitle
        title="Fees Payment"
        subtitle="Access,manage and control payment of school fees"
        img={EMPTY_IMAGES.assessment}
        color="primary.main"
        right={
          <Button
            startIcon={<HistoryRounded />}
            variant="contained"
            onClick={handleOpenPaymentHistory}
          >
            {matches ? "" : "Payment History"}
          </Button>
        }
      />

      <Stack p={2} spacing={2} bgcolor="#fff" my={2} borderRadius="12px">
        <Stack
          direction="row"
          justifyContent={{ xs: "center", sm: "space-between" }}
          alignItems="center"
          gap={2}
        >
          <Autocomplete
            sx={{ width: { xs: "100%", sm: 300 } }}
            size="small"
            fullWidth
            options={fees || []}
            loading={feesLoading}
            disableClearable
            closeText=" "
            noOptionsText="No Level Available"
            isOptionEqualToValue={(option, value) =>
              value?.levelId === undefined ||
              value?.levelId === "" ||
              option?.levelId === value?.levelId
            }
            getOptionLabel={(option) => option?.levelName || ""}
            value={currentLevel}
            onChange={(e, value) => {
              setValue("level", value);
              setSearchParams((params) => {
                params.set("level_id", value?.levelId);
                params.set("level_name", value?.levelName);
                return params;
              });
            }}
            onClose={() => {}}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Level"
                error={Boolean(errors?.level)}
                helperText={errors?.level?.levelId?.message}
              />
            )}
          />
        </Stack>

        {/* search */}
        <Autocomplete
          fullWidth
          size="small"
          options={students ? students : []}
          loading={levelLoading}
          disableClearable
          closeText=" "
          noOptionsText="No Student found"
          isOptionEqualToValue={(option, value) =>
            value?._id === undefined ||
            value?._id === "" ||
            option?._id === value?._id
          }
          getOptionLabel={(option) => option?.fullName || ""}
          value={studentInfo}
          onChange={(e, value) =>
            setValue("student", {
              _id: value?.id,
              fullName: value?.fullName,
              profile: value?.profile,
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for student"
              error={Boolean(errors?.student)}
              helperText={errors?.student?._id?.message}
            />
          )}
        />
      </Stack>

      {studentFees.isError && (
        <QueryError what="this student's fees" error={studentFees.error} onRetry={studentFees.refetch} />
      )}
      <Grid container spacing={4} p={2} bgcolor="#fff" borderRadius="12px">
        <Grid
          size={{
            xs: 12,
            sm: 6,
          }}
        >
          <div style={{ display: "flex", gap: "4px", paddingBottom: "4px" }}>
            <Person2Sharp color="secondary" />
            <Typography variant="h6">Personal Details</Typography>
          </div>
          <Divider />

          <Paper elevation={1} sx={{ marginTop: 2, p: 1 }}>
            <Stack
              spacing={1}
              justifyContent="center"
              alignItems="center"
              py={2}
            >
              <Avatar
                src={studentInfo?.profile}
                sx={{ width: 80, height: 80 }}
              />
            </Stack>
            <Stack spacing={2} py={2}>
              <TextField
                size="small"
                label="Student's Name"
                InputProps={{
                  readOnly: true,
                }}
                value={studentInfo?.fullName || ""}
              />

              <TextField
                size="small"
                // label='Level'
                value={
                  currentLevel?.levelName || searchParams.get("level_name")
                }
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />
              <SelectInput
                label="Payment Method"
                name="paymentMethod"
                control={control}
                size="small"
              >
                <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
              </SelectInput>
              <Input
                control={control}
                name="amount"
                type="text"
                inputMode="decimal"
                label="Amount to be paid"
                size="small"
                placeholder="Enter Amount here"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">GHS</InputAdornment>
                  ),
                }}
              />

              {!blocker && Number(feeInfo?.previous?.remaining) > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {`This student still owes ${currencyOrDash(feeInfo?.previous?.remaining)} from earlier terms. A payment goes to the oldest unpaid term first.`}
                </Typography>
              )}
              {blocker && (
                <Typography variant="caption" color="text.secondary">
                  {blocker}
                </Typography>
              )}
              <Button
                disabled={Boolean(blocker) || isPending}
                size="large"
                variant="contained"
                startIcon={<MonetizationOnRounded />}
                onClick={handleOpenPayee}
              >
                Proceed
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 6,
          }}
        >
          <div style={{ display: "flex", gap: "4px", paddingBottom: "4px" }}>
            <MonetizationOn color="secondary" />
            <Typography variant="h6">Fees Details</Typography>
          </div>
          <Divider />
          {studentFees.isFetching ? (
            <FeesDetailsSkeleton />
          ) : (
            <Paper elevation={1} sx={{ marginTop: 2 }}>
              <Stack spacing={2} padding={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleViewStudentFeeHistory}
                  disabled={_.isEmpty(studentInfo?._id)}
                >
                  Payment Details
                </Button>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="bold">Fees</Typography>
                  {!_.isEmpty(studentInfo?._id) &&
                  studentFees?.data?.totalOutstanding === 0 ? (
                    <Chip
                      label="Full Payment"
                      color="success"
                      size="medium"
                      sx={{ color: "white" }}
                      icon={<Check />}
                    />
                  ) : null}
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Fees For Term</Typography>
                  <Typography variant="body2">
                    {currencyOrDash(
                      studentFees?.data?.current?.fees ?? (studentInfo?._id ? undefined : currentFees)
                    )}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Arreas </Typography>
                  <Typography variant="body2">
                    {currencyOrDash(studentFees?.data?.previous?.remaining)}
                  </Typography>
                </Stack>
                <Divider flexItem />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight="bold">Total </Typography>
                  <Typography variant="body2">
                    {currencyOrDash(studentFees?.data?.totalFees)}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight="bold">Fees Paid </Typography>
                  <Typography variant="body2">
                    {currencyOrDash(studentFees?.data?.current?.paid)}
                  </Typography>
                </Stack>
                <Divider flexItem />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight="bold">Outstanding Fees </Typography>
                  <Typography variant="body2">
                    {currencyOrDash(studentFees?.data?.totalOutstanding)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
      <PayeeDetails
        isPending={isPending}
        open={showPayeeDetails}
        onClose={() => setShowPayeeDetails(false)}
        control={control}
        handleMakePayment={handleSubmit(onSubmit)}
      />
    </>
  );
};

export default FeeMakePayment;
