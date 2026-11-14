import React from "react";
import { Box } from "@mui/material";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import BookmarksOutlinedIcon from "@mui/icons-material/BookmarksOutlined";
import DoNotDisturbOnTotalSilenceOutlinedIcon from "@mui/icons-material/DoNotDisturbOnTotalSilenceOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import PropTypes from "prop-types";
import ExamsHomeCard from "@/components/cards/ExamsHomeCard";
import { examSummaryView, ofComplete, outOf } from "./examSummaryView";

const iconStyle = { width: 28, height: 28 };
const NONE = "–";

// The row of summary cards on a level's exam page.
const ExamSummary = ({ data }) => {
  const v = examSummaryView(data);
  const passFailHint = ofComplete(v.complete);

  return (
    <Box
      aria-label="Exams summary"
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 2,
        py: 2,
      }}
    >
      <ExamsHomeCard title="Students" value={v.students} icon={<PersonOutlineOutlinedIcon sx={iconStyle} />} color="info" />
      <ExamsHomeCard title="Highest score" value={v.highest ?? NONE} hint={v.highest === null ? "No results yet" : outOf(v.maxScore)} icon={<BookmarksOutlinedIcon sx={iconStyle} />} color="success" />
      <ExamsHomeCard title="Lowest score" value={v.lowest ?? NONE} hint={v.lowest === null ? "No results yet" : outOf(v.maxScore)} icon={<DoNotDisturbOnTotalSilenceOutlinedIcon sx={iconStyle} />} color="warning" />
      <ExamsHomeCard title="Passed" value={v.passed} hint={passFailHint} icon={<CheckCircleOutlinedIcon sx={iconStyle} />} color="success" />
      <ExamsHomeCard title="Failed" value={v.failed} hint={passFailHint} icon={<HighlightOffOutlinedIcon sx={iconStyle} />} color="error" />
      {v.incomplete !== null && (
        <ExamsHomeCard title="Results not complete" value={v.incomplete} hint="Not counted as passed or failed" icon={<HourglassEmptyOutlinedIcon sx={iconStyle} />} color="info" />
      )}
    </Box>
  );
};

ExamSummary.propTypes = { data: PropTypes.object };

export default ExamSummary;
