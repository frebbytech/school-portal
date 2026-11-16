import React, { useContext, useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { getAllCurrentFeesPaymentHistoryByDate } from "@/api/currentFeeAPI";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import dayjs from "@/lib/dates";
import _ from "lodash";
import { currencyFormatter } from "@/config/currencyFormatter";
import { UserContext } from "@/context/providers/UserProvider";
import fee_icon from "@/assets/images/header/fee_ico.svg";
import CustomTitle from "@/components/custom/CustomTitle";
import QueryError from "@/components/QueryError";

function FeePaymentHistory() {
  const { session } = useContext(UserContext);
  const navigate = useNavigate();
  const [date, setDate] = useState(dayjs());

  const fees = useQuery({
    queryKey: ["fees-for-day", date],
    queryFn: () =>
      getAllCurrentFeesPaymentHistoryByDate({
        session: session?.sessionId,
        term: session?.termId,
        date: date.toDate(),
      }),
    enabled: !!session?.sessionId && !!session?.termId && !!date,
  });

  const totalAmount = useMemo(() => {
    if (!fees?.data?.length) return 0;
    // Sum in pesewas so the total never shows rounding noise.
    return _.sumBy(fees.data, ({ payment }) => Math.round(Number(payment?.paid) * 100) || 0) / 100;
  }, [fees?.data]);

  return (
    <>
      {/* <Back to="/fee/history" color="primary.main" /> */}
      <CustomTitle
        title="Fee Payment History"
        subtitle="View fee transactions"
        color="primary.main"
        showBack={true}
        to="/fee/payment"
      />

      <>
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "start", md: "center" }}
          gap={2}
          my={4}
        >
          <CustomDatePicker
            label="Date Of Payment"
            date={date}
            setDate={(d) => d && dayjs(d).isValid() && setDate(dayjs(d))}
            style={{
              width: 300,
            }}
            // shouldDisableWeekends={true}
          />
          <Stack>
            <Typography textAlign="right">Total Amount</Typography>
            <Typography textAlign="right" variant="h5">
              {currencyFormatter(totalAmount)}
            </Typography>
          </Stack>
        </Box>

        {fees.isError && <QueryError what="these payments" error={fees.error} onRetry={fees.refetch} />}
        <CustomizedMaterialTable
          isPending={fees.isPending || fees.isLoading}
          icon={fee_icon}
          title={`Fee Payment on ${date.format("LL")}`}
          addButtonImg={fee_icon}
          addButtonMessage="Payment not available"
          search
          handleRefresh={() => fees.refetch()}
          columns={[
            {
              title: "Paid On",
              field: "payment.createdAt",
              render: ({ payment }) => dayjs(payment?.createdAt).format("LLL"),
            },
            {
              title: "Student",
              field: "student",
            },
            {
              title: "Level",
              field: "level",
            },
            {
              title: "Amount Paid",
              field: "payment.paid",
              type: "currency",
              currencySetting: {
                currencyCode: "GHS",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            },
            {
              title: "Completed By",
              field: "payment.issuerName",
            },
            {
              title: "Receipt",
              sorting: false,
              render: ({ payment }) =>
                payment?.id ? (
                  <Button size="small" onClick={() => navigate(`/fee/receipt/${encodeURIComponent(payment.id)}`)}>
                    View
                  </Button>
                ) : null,
            },
          ]}
          data={fees?.data || []}
          actions={[]}
        />
      </>
    </>
  );
}

FeePaymentHistory.propTypes = {
  open: PropTypes.bool,
  setOpen: PropTypes.func,
};

export default FeePaymentHistory;
