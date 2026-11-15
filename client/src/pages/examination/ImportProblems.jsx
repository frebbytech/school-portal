import React from "react";
import { Alert, Table, TableBody, TableCell, TableHead, TableRow, Box } from "@mui/material";
import PropTypes from "prop-types";

// Lists the rows of an imported sheet that cannot be imported and why, so the person can
// fix the file (or accept that those rows are left out) instead of seeing one vague message.
const ImportProblems = ({ problems }) => {
  if (!problems?.length) return null;
  return (
    <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
      <Box component="p" sx={{ m: 0, mb: 1, fontWeight: 600 }}>
        {problems.length} {problems.length === 1 ? "row" : "rows"} will not be imported
      </Box>
      <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
        <Table size="small" aria-label="Rows that cannot be imported">
          <TableHead>
            <TableRow>
              <TableCell>Row</TableCell>
              <TableCell>Index number</TableCell>
              <TableCell>Problem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {problems.map((p) => (
              <TableRow key={`${p.row}-${p.indexnumber}`}>
                <TableCell>{p.row}</TableCell>
                <TableCell>{p.indexnumber || "–"}</TableCell>
                <TableCell>{p.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Alert>
  );
};

ImportProblems.propTypes = {
  problems: PropTypes.arrayOf(
    PropTypes.shape({ row: PropTypes.number, indexnumber: PropTypes.string, message: PropTypes.string })
  ),
};

export default ImportProblems;
