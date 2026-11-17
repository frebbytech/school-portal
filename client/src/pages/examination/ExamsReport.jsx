import React, { use, useState } from "react";
import { Dialog, DialogContent, DialogActions, Button } from "@mui/material";
import Swal from "sweetalert2";
import Transition from "@/components/animations/Transition";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { UserContext } from "@/context/providers/UserProvider";
import { publishConfirmText } from "./publishOutcome";
import { usePublishing } from "./usePublishing";
import PublishStatus from "./PublishStatus";
import ReportCard from "./ReportCard";
import { useSearchParams } from "react-router-dom";
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

  const { session } = use(UserContext);
  const { publication, active, starting, start } = usePublishing({
    levelId: student?.levelId,
    termId: session?.termId,
    sessionId: session?.sessionId,
    examId: searchParams.get("eid"),
  });
  const isPending = starting || active;

  const handlePublishReports = () => {
    Swal.fire({
      title: "Publishing Report",
      text: publishConfirmText(value, student?.fullName || "this student"),
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      start(value);
      handleCloseOption();
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
            disabled={isPending}
            onClick={() => setOpenPublishOption(true)}
          >
            {isPending ? "Publishing..." : "Publish Report"}
          </Button>
        </DialogActions>
        <DialogContent>
          <PublishStatus publication={publication} />
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

    </>
  );
};
ExamsReport.propTypes = {
  student: PropTypes.object,
};

export default React.memo(ExamsReport);
