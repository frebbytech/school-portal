import React from "react";
import PropTypes from "prop-types";
import { Alert, LinearProgress, Stack, Typography } from "@mui/material";
import dayjs from "@/lib/dates";
import { isActive, progressLabel, progressPercent } from "./publishOutcome";

// What happened to the last publish of this class's report cards: progress while it runs,
// the counts (or the reason) when it is over.
const PublishStatus = ({ publication }) => {
  if (!publication) return null;

  if (isActive(publication)) {
    const determinate = publication.total > 0 && publication.status === "running";
    return (
      <Stack spacing={0.5} role="status" aria-live="polite">
        <Typography variant="body2">{progressLabel(publication)}</Typography>
        <LinearProgress
          variant={determinate ? "determinate" : "indeterminate"}
          value={progressPercent(publication)}
          aria-label="Publishing progress"
        />
      </Stack>
    );
  }

  const when = publication.finishedAt || publication.createdAt;
  const severity = publication.status === "failed" ? "error" : "success";
  return (
    <Alert severity={severity} variant="outlined" sx={{ py: 0 }}>
      {publication.message}
      {when ? ` (${dayjs(when).format("D MMM YYYY, h:mm a")})` : ""}
    </Alert>
  );
};

PublishStatus.propTypes = {
  publication: PropTypes.shape({
    status: PropTypes.string,
    phase: PropTypes.string,
    done: PropTypes.number,
    total: PropTypes.number,
    message: PropTypes.string,
    finishedAt: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

export default PublishStatus;
