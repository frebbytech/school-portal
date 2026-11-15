import { PrintRounded, SchoolRounded } from "@mui/icons-material";
import {
  Avatar,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import React, { useRef } from "react";
import _ from "lodash";
import { useReactToPrint } from "react-to-print";
import dayjs from "@/lib/dates";
import FeePrintItem from "./FeePrintItem";
import { Navigate, useLocation } from "react-router-dom";

import { currencyFormatter } from "@/config/currencyFormatter";
import Back from "@/components/Back";
import { useAuth } from "@/hooks/useAuth";

function FeePrint() {
  const { school_info } = useAuth();
  // const fee
  const componentRef = useRef();
  const { state } = useLocation();

  if (_.isEmpty(state?.feePrintData)) {
    return <Navigate to="/fee/payment" />;
  }

  const feePrintData = state?.feePrintData;

  const reactToPrintFn = useReactToPrint({
    documentTitle: "Fee Receipt",
    contentRef: componentRef,
  });
  return (
    <>
      <Back to="/fee/payment" color="primary.main" />

      <Container maxWidth="xs" sx={{ padding: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintRounded />}
          onClick={() => reactToPrintFn()}
        >
          Print Receipt
        </Button>

        <Container
          ref={componentRef}
          maxWidth="xs"
          sx={{
            padding: 2,
            bgcolor: "#fff",
            marginY: 2,
            boxShadow: "0px 1px 2px rgba(0,0,0,0.1)",
            border: "1px solid lightgray",
          }}
        >
          <Stack columnGap={2} padding={1}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              columnGap={2}
            >
              {school_info?.badge ? (
                <Avatar
                  alt="school logo"
                  loading="lazy"
                  srcSet={school_info?.badge}
                  sx={{
                    width: 40,
                    height: 40,
                  }}
                />
              ) : (
                <SchoolRounded sx={{ width: 30, height: 30 }} />
              )}
              <Stack justifyContent="center" alignItems="center">
                <Typography variant="h6" textAlign="center">
                  {_.startCase(school_info?.name)}
                </Typography>
                <Typography variant="caption">
                  {school_info?.address}
                </Typography>
                <Typography variant="caption">
                  {school_info?.location}
                </Typography>
                <Typography variant="caption" fontStyle="italic">
                  {school_info?.motto}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
          <Typography
            textAlign="center"
            sx={{
              bgcolor: "primary.main",
              color: "#fff",
              marginY: 2,
            }}
          >
            Fee Receipt
          </Typography>
          <Stack direction="row" justifyContent="space-between" paddingY={2}>
            <Typography variant="caption">
              Receipt No.: {feePrintData?._id}
            </Typography>
            <Typography variant="caption">
              Date:{" "}
              {feePrintData?.payment
                ? dayjs(feePrintData?.payment?.date).format("L")
                : ""}
            </Typography>
          </Stack>

          <Divider>
            <Chip label="Details" size="small" />
          </Divider>
          <Stack rowGap={2} paddingY={2}>
            <FeePrintItem
              title="Received From"
              value={feePrintData?.fullName}
            />
            <FeePrintItem title="Level" value={feePrintData?.levelType} />
            <Stack direction="row" justifyContent="space-between">
              <FeePrintItem
                title="The sum of"
                value={currencyFormatter(
                  feePrintData?.payment ? feePrintData?.payment?.paid : 0
                )}
              />
              <FeePrintItem
                title="Outstanding"
                value={currencyFormatter(
                  feePrintData?.payment ? feePrintData?.payment?.outstanding : 0
                )}
              />
            </Stack>
            <FeePrintItem title="Being payment of" value="School Fees" />
            <FeePrintItem
              title="Received by"
              value={
                feePrintData?.payment
                  ? _.startCase(feePrintData?.payment?.issuer)
                  : ""
              }
            />
          </Stack>
          <Divider />
          {/* <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <small>FrebbyTech Consults</small>
        </div> */}
        </Container>
      </Container>
    </>
  );
}

export default FeePrint;
