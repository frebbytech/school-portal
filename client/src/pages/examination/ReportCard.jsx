/* eslint-disable react/prop-types */
import React, { use, useRef, useState } from "react";
import { Stack, Button } from "@mui/material";

import AddRemarks from "@/components/modals/AddRemarks";
import { PrintRounded } from "@mui/icons-material";
import { UserContext } from "@/context/providers/UserProvider";
import { useReactToPrint } from "react-to-print";
import TerminalReport2 from "@/components/reportcards/report-card-2";
import TerminalReport1 from "@/components/reportcards/report-card-1";
import useLevelById from "@/components/hooks/useLevelById";
import { parseScorePreference } from "./scoreRules";
import { REPORT_CARD_PAGE_STYLE } from "./reportCardPrint";

function ReportCard({ student, style }) {
  const componentRef = useRef();
  const { school_info, session } = use(UserContext);
  const { gradeSystem } = useLevelById(student?.levelId);

  const [openRemarks, setOpenRemarks] = useState(false);

  const { classMax: classScorePreference, examsMax: examsScorePreference } = parseScorePreference(
    session?.exams?.scorePreference
  );

  const reactToPrintFn = useReactToPrint({
    documentTitle: `${student?.fullName}-${student?.level}`,
    contentRef: componentRef,
    pageStyle: REPORT_CARD_PAGE_STYLE,
  });

  return (
    <>
      <Stack
        className="report-card"
        ref={componentRef}
        spacing={1}
        sx={{
          ...style,
          width: "8.3in",
          minHeight: "11.7in",
          margin: "0 auto",
          padding: "16px",
          border: "1px solid lightgray",
          position: "relative",
          background: ` linear-gradient(
            rgba(255, 255, 255, 0.96),
            rgba(255, 255, 255, 0.96)
          ),
          url("${school_info?.badge}")`,
          mb: 1,
          overflowX: "auto",
          fontSize: "12px",
        }}
        // style={style}
      >
        <Button
          variant="text"
          className="add-remarks-btn"
          onClick={() => setOpenRemarks(true)}
          sx={{
            alignSelf: "flex-start",
            cursor: "pointer",
            zIndex: "999",
            textDecoration: "underline",
          }}
        >
          Add Remarks
        </Button>
        <Button
          className="print-btn"
          variant="text"
          startIcon={<PrintRounded />}
          sx={{
            position: "absolute",
            top: 3,
            right: 3,
            zIndex: 999,
          }}
          onClick={() => reactToPrintFn()}
        >
          Print
        </Button>
        {session?.report?.template === "template2" ? (
          <TerminalReport2
            student={student}
            classScore={classScorePreference}
            examsScore={examsScorePreference}
            ratings={gradeSystem?.ratings}
          />
        ) : (
          <TerminalReport1
            student={student}
            classScore={classScorePreference}
            examsScore={examsScorePreference}
            ratings={gradeSystem?.ratings}
          />
        )}
      </Stack>

      <AddRemarks
        open={openRemarks}
        setOpen={setOpenRemarks}
        id={student?._id}
        remark={student?.comments}
      />
    </>
  );
}

export default ReportCard;
