import { Dialog, DialogContent, List, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useContext } from "react";
import { getAllCurrentFeesByLevel } from "@/api/currentFeeAPI";
import QueryError from "@/components/QueryError";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { currencyFormatter } from "@/config/currencyFormatter";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import ViewLevelFeeInfoItem from "./ViewLevelFeeInfoItem";

function ViewLevelFeeInfo() {
  const {
    schoolSessionState: { levelFeeInfo },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const levelFeeSummary = useQuery({
    queryKey: ["level-fee", levelFeeInfo.data],
    queryFn: () => getAllCurrentFeesByLevel(levelFeeInfo?.data),
    enabled: !!levelFeeInfo?.data?.term && !!levelFeeInfo?.data?.level,
  });

  const handleClose = () => {
    schoolSessionDispatch({
      type: "viewLevelFeeInfo",
      payload: { open: false, data: {} },
    });
  };

  // console.log(levelFeeInfo)

  return (
    <Dialog
      open={levelFeeInfo.open}
      fullWidth
      maxWidth="sm"
      onClose={handleClose}
    >
      <CustomDialogTitle title="School Fees Details" onClose={handleClose} />
      <DialogContent>
        {levelFeeSummary?.isPending && levelFeeSummary.fetchStatus !== "idle" && <Typography>Loading.....</Typography>}
        {levelFeeSummary?.isError && <QueryError what="this class's fees" error={levelFeeSummary.error} onRetry={levelFeeSummary.refetch} />}
        {levelFeeSummary?.isSuccess && (
          <Stack rowGap={2}>
            <ViewLevelFeeInfoItem
              title="Level"
              value={levelFeeInfo?.data?.levelName}
            />
            <Stack direction="row" columnGap={2}>
              <ViewLevelFeeInfoItem
                title=" Total Fee"
                value={currencyFormatter(levelFeeInfo?.data?.fee)}
              />
              <List>
                {levelFeeInfo.data.amount &&
                  levelFeeInfo.data.amount.map(({ fee, amount }) => {
                    return (
                      <Stack key={fee} paddingY={1}>
                        <small
                          style={{
                            color: "var(--primary)",
                            fontWeight: "bold",
                          }}
                        >
                          {fee}
                        </small>
                        <small>{currencyFormatter(amount)}</small>
                      </Stack>
                    );
                  })}
              </List>
            </Stack>

            <ViewLevelFeeInfoItem
              title="Number of Students"
              value={levelFeeInfo?.data?.noOfStudents}
            />

            <ViewLevelFeeInfoItem
              title="Total Expected Amount of Fees"
              value={currencyFormatter(
                levelFeeInfo?.data?.fee * levelFeeInfo?.data?.noOfStudents
              )}
            />
            <ViewLevelFeeInfoItem
              title="Total Amount of Fees Paid"
              value={currencyFormatter(levelFeeSummary?.data)}
            />

            <ViewLevelFeeInfoItem
              title="Total Outstanding Fees"
              value={currencyFormatter(
                Number(
                  levelFeeInfo?.data?.fee * levelFeeInfo?.data?.noOfStudents
                ) - Number(levelFeeSummary?.data)
              )}
            />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ViewLevelFeeInfo;
