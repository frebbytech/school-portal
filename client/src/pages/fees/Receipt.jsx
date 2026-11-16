// FeeReceipt.tsx
import React, { use, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Grid2 as Grid,
  Paper,
  Container,
  Button,
} from "@mui/material";
import { UserContext } from "@/context/providers/UserProvider";
import dayjs from "@/lib/dates";
import { currencyFormatter } from "@/config/currencyFormatter";
import { receiptFigures } from "./paymentRules";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReceipt } from "@/api/currentFeeAPI";
import QueryError from "@/components/QueryError";
import { useReactToPrint } from "react-to-print";
import { PrintRounded } from "@mui/icons-material";

export default function Receipt() {
  const componentRef = useRef();
  const { school_info } = use(UserContext);
  const navigate = useNavigate();
  const { state } = useLocation();

  const { invoice } = useParams();
  // Right after a payment the figures arrive with the navigation; otherwise (a reprint from
  // history, or the page reloaded) the receipt is loaded again by its number.
  const passed = fee?.id && state.fee.id === invoice ? state.fee : null;
  const saved = useQuery({
    queryKey: ["receipt", invoice],
    queryFn: () => getReceipt(invoice),
    enabled: Boolean(invoice) && !passed,
  });
  const fee = passed || saved.data;
  const figures = receiptFigures(fee);

  const reactToPrintFn = useReactToPrint({
    documentTitle: "Fee Receipt",
    contentRef: componentRef,
    onAfterPrint: () => {
      navigate(-1, {
        replace: true,
      });
    },
  });

  // The receipt comes from the payment that was just made. After a reload (or a bookmark)
  // there is nothing to show, and an empty receipt must not look like a real one.
  if (invoice && !passed && saved.isPending) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography>Loading receipt…</Typography>
      </Container>
    );
  }

  if (invoice && !passed && saved.isError) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <QueryError what="this receipt" error={saved.error} onRetry={saved.refetch} />
        <Button variant="contained" onClick={() => navigate("/fee/history")}>
          Payment History
        </Button>
      </Container>
    );
  }

  if (!fee?.id) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          No receipt to show
        </Typography>
        <Typography color="text.secondary" paragraph>
          Open a receipt from Payment History, or record a payment to get a new one.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/fee/history")}>
          Payment History
        </Button>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{ mx: "auto", display: "grid", placeItems: "center" }}
    >
      <Paper
        className="fee-receipt"
        ref={componentRef}
        sx={{
          p: 3,
          maxWidth: 450,
          my: 2,
          mx: "auto",
          border: "1px solid lightgray",
          boxShadow: "0px 1px 2px rgba(0,0,0,0.1)",
          position: "relative",
        }}
      >
        <Button
          className="print-btn"
          variant="text"
          startIcon={<PrintRounded />}
          sx={{
            position: "absolute",
            top: 3,
            right: 3,
            zIndex: 999999999,
          }}
          onClick={() => reactToPrintFn()}
        >
          Print
        </Button>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            mb: 4,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={school_info?.badge} alt="logo" width={60} />
            <Box>
              <Typography
                fontSize={12}
                variant="h5"
                color="primary"
                textTransform="uppercase"
                fontWeight="bold"
              >
                {school_info?.name}
              </Typography>
              <Typography fontSize={12}>{school_info?.address}</Typography>
              <Typography fontSize={12}>{school_info?.email}</Typography>
              <Typography fontSize={12}>{school_info?.phonenumber}</Typography>
            </Box>
          </Box>
          <Box
            pt={2}
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
          >
            <Typography fontWeight="bold" fontSize={12}>
              Invoice No:
            </Typography>
            <Typography fontSize={12}>{fee?.id}</Typography>
            <Typography fontWeight="bold" fontSize={12}>
              Invoice Date:
            </Typography>
            <Typography fontSize={12}>
              {dayjs(fee?.createdAt).isValid() ? dayjs(fee.createdAt).format("LLL") : ""}
            </Typography>
          </Box>
        </Box>

        {/* Invoice To */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            fontSize={12}
            variant="h5"
            color="primary"
            fontWeight="bold"
          >
            FEE RECEIPT
          </Typography>
          <Divider
            sx={{ width: 60, mx: "auto", mt: 1, borderColor: "primary" }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography fontSize={12} fontWeight="bold">
            Invoice To
          </Typography>
          <Typography fontSize={12} color="primary">
            {fee?.payer?.name}
          </Typography>
          <Typography fontSize={12}>
            Phone: {fee?.payer?.phonenumber}
          </Typography>
          {fee?.studentName && (
            <Typography fontSize={12}>
              Student: {fee.studentName}
              {fee.levelName ? ` (${fee.levelName})` : ""}
            </Typography>
          )}
        </Box>

        {/* Table */}
        <Table sx={{ border: "1px solid var(--primary)", mb: 3 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "var(--primary)" }}>
              <TableCell>NO.</TableCell>
              <TableCell> DESCRIPTION</TableCell>
              <TableCell align="right">AMOUNT</TableCell>
              <TableCell align="right">BALANCE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{`01`}</TableCell>
              <TableCell>Fees</TableCell>
              <TableCell align="right">
                {currencyFormatter(figures.paidNow)}
              </TableCell>
              <TableCell align="right">{currencyFormatter(figures.outstanding)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Payment Details and Summary */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography fontSize={12} fontWeight="bold" color="primary" mb={1}>
              Payments Method:
            </Typography>
            <Typography fontSize={12}>{fee?.paymentMethod}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ maxWidth: 250, ml: "auto" }}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Typography fontSize={12}>Total Fees :</Typography>
                <Typography fontSize={12} align="right">
                  {currencyFormatter(figures.termFee)}
                </Typography>
              </Box>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Typography fontSize={12}>Arreas :</Typography>
                <Typography fontSize={12} align="right">
                  {currencyFormatter(figures.arrears)}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {figures.appliedTo.length > 1 && (
                <Box mb={1}>
                  <Typography fontSize={12} align="right" fontWeight="bold">
                    This payment was applied to the oldest unpaid term first:
                  </Typography>
                  {figures.appliedTo.map((part, i) => (
                    <Typography key={i} fontSize={12} align="right">
                      {part.term}: {currencyFormatter(part.amount)}
                    </Typography>
                  ))}
                </Box>
              )}
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Typography fontSize={12}>Paid This Term :</Typography>
                <Typography fontSize={12} align="right">
                  {currencyFormatter(figures.totalPaid)}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Typography fontSize={12}>Outstanding :</Typography>
                <Typography fontSize={12} align="right">
                  {currencyFormatter(figures.outstanding)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <img
            src={school_info?.badge}
            alt="school logo"
            style={{
              opacity: 0.03,
              width: "6in",
              height: "5.5in",
            }}
          />
        </div>
      </Paper>

      <Button variant="contained" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Container>
  );
}
