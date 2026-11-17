import React, { use, useState } from "react";
import { Dialog, DialogContent, DialogActions, Button } from "@mui/material";
import Swal from "sweetalert2";
import Transition from "@/components/animations/Transition";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { useMutation } from "@tanstack/react-query";
import { publishReport } from "@/api/ExaminationAPI";
import { publishAlert, publishConfirmText, publishFailure, publishOutcome } from "./publishOutcome";
import ReportCard from "./ReportCard";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import PublishResultOption from "@/components/modals/PublishResultOption";
import PropTypes from "prop-types";


const ExamsReport = ({ student }) => {
  const [openPublishOption, setOpenPublishOption] = useState(false);
  const [value, setValue] = useState("sms");
  const [searchParams] = useSearchParams();
  const { schoolSessionState, schoolSessionDispatch } =
    use(SchoolSessionContext);


  const open = schoolSessionState.viewReport.open;

  //close dialog
  const handleClose = () => {
    schoolSessionDispatch({
      type: "closeViewReport",
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: publishReport,
  });

  const handlePublishReports = () => {
    Swal.fire({
      title: "Publishing Report",
      text: publishConfirmText(value, student?.fullName || "this student"),
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      mutate(
        { id: searchParams.get("eid"), value },
        {
          // The result replaces the "please wait" message; it is not closed afterwards.
          onSuccess: (data) => {
            schoolSessionDispatch(publishAlert(publishOutcome(data)));
            handleCloseOption();
          },
          onError: (error) => {
            schoolSessionDispatch(publishAlert(publishFailure(error)));
          },
        }
      );
    });
  };

  const handleCloseOption = () => {
    setOpenPublishOption(false);
    setValue("sms");
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        TransitionComponent={Transition}
      >
        <CustomDialogTitle title="Report Card" onClose={handleClose} />
        <DialogActions>
          <Button
            loading={isPending}
            onClick={() => setOpenPublishOption(true)}
          >
            {isPending ? "Please Wait...." : "Publish Report"}
          </Button>
        </DialogActions>
        <DialogContent>
          <ReportCard student={student} />
        </DialogContent>
      </Dialog>

      <PublishResultOption
        open={openPublishOption}
        setOpen={setOpenPublishOption}
        value={value}
        setValue={setValue}
        onClose={handleCloseOption}
        handlePublish={handlePublishReports}
      />

      {isPending && <LoadingSpinner value="Publishing. This might take a while, please wait..." />}
    </>
  );
};
ExamsReport.propTypes = {
  student: PropTypes.object,
};

export default React.memo(ExamsReport);
