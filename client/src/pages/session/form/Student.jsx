import React, { useContext, useState, useRef } from "react";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError } from "@/context/actions/globalAlertActions";
import _ from "lodash";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Modal,
  Box,
  Typography,
  Stack,
  Link,
  FormHelperText,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { downloadTemplate } from "@/api/userAPI";
import { useQuery } from "@tanstack/react-query";
import { getPreviousLevels } from "@/api/levelAPI";
import { getAllTerms } from "@/api/termAPI";
import { readXLSX } from "@/config/readXLSX";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { validateExcelHeaders } from "@/config/helper";
import { DATA_HEADERS } from "@/mockup/columns/sessionColumns";

const Student = ({ watch, setValue, errors, setError, handleNext }) => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const students = watch("students");
  const levels = watch("levels");
  // const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMethod, setInputMethod] = useState("file");
  const [uploadedFiles, setUploadedFiles] = useState(_.compact(students));
  const [modalOpen, setModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [file, setFile] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [previewFileIndex, setPreviewFileIndex] = useState(null);
  const [level, setLevel] = useState({ name: "", type: "" });
  const [visibleRows, setVisibleRows] = useState(20);

  const previewTableRef = useRef(null);

  const [levelName, setLevelName] = useState({
    _id: "",
    level: { name: "", type: "" },
    file: "",
    data: [],
    isPrevious: true,
  });

  const [session, setSession] = useState({
    _id: "",
    sessionId: "",
    academicYear: "",
    term: "",
  });

  const previousSessions = useQuery({
    queryKey: ["previous-sessions"],
    queryFn: () => getAllTerms("dropdown"),
    initialData: [],
  });

  const previousLevels = useQuery({
    queryKey: ["previous-sessions", session.sessionId, session._id],
    queryFn: () => getPreviousLevels(session.sessionId, session._id, "student"),
    enabled: !!session.sessionId && !!session._id,
    initialData: [],
  });

  // Handle file selection
  const handleFileChange = async (e) => {
    setError("students", {
      message: "",
      type: "custom",
    });
    const headers = DATA_HEADERS.STUDENTS;
    const uploadedFile = e.target.files[0];
    const result = await validateExcelHeaders(uploadedFile, headers);

    if (!result.valid) {
      setError("students", {
        message: `Invalid file headers.Expected headers: [${headers.join(
          ", "
        )}].Missing headers: [${result.missing.join(", ")}].`,
        type: "custom",
      });
      return;
    }

    if (uploadedFile) {
      setIsLoading(true);
      setFile(uploadedFile);

      try {
        // Parse Excel/CSV file
        const results = await readXLSX(uploadedFile);
        if (results.length > 0) {
          setPreviewData(results);
          setFilteredData(results);
          setVisibleRows(20); // Reset rows on new file
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle preview modal
  const handleOpenModal = (index) => {
    setPreviewFileIndex(index);
    setPreviewData(uploadedFiles[index]?.data || []);
    setFilteredData(uploadedFiles[index]?.data || []);
    setVisibleRows(20); // Reset rows when opening modal
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  // Add selected file to the list
  const handleAddToList = () => {
    // return;
    if (level && file) {
      if (previewData.length === 0) {
        setError("students", {
          message:
            inputMethod === "file"
              ? "No student found in selected file!"
              : "No student found in selected Level!",
          type: "custom",
        });
        return;
      }
      const newLevels = _.uniqBy(
        [
          ...uploadedFiles,
          {
            class: level,
            fileName: inputMethod === "file" ? file.name : levelName.file,
            data: previewData,
            isPrevious: inputMethod === "autocomplete" ? true : false,
          },
        ],
        (obj) => `${obj?.class?.name}-${obj?.class?.type}`
      );

      setUploadedFiles(newLevels);
      setValue("students", newLevels);

      setLevel({ name: "", type: "" });
      setPreviewData([]);
    }
  };

  // Delete a file from the list
  const handleDeleteFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    setValue(
      "students",
      uploadedFiles.filter((_, i) => i !== index)
    );
  };

  // Delete a row from the preview
  const handleDeleteRow = (rowIndex) => {
    const updatedData = filteredData.filter((_, i) => i !== rowIndex);
    setFilteredData(updatedData);

    if (previewFileIndex !== null) {
      let updatedFiles = [...uploadedFiles];
      updatedFiles[previewFileIndex].data = updatedData;
      setUploadedFiles(updatedFiles);
    }
  };

  // Clear all uploaded data
  const handleClearAll = () => {
    setUploadedFiles([]);
    setValue("students", []);
  };

  // Load more rows when scrolling
  const handleScroll = () => {
    if (previewTableRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = previewTableRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setVisibleRows((prev) => Math.min(prev + 20, filteredData.length));
      }
    }
  };

  // Handle Search Functionality
  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();

    if (!query) {
      setFilteredData(previewData);
      setVisibleRows(20);
    } else {
      const filteredResults = previewData.filter((row) =>
        Object.values(row).some((value) =>
          value.toString().toLowerCase().includes(query)
        )
      );
      setFilteredData(filteredResults);
      setVisibleRows(20);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate("students");
    } catch (error) {
      schoolSessionDispatch(alertError(error));
    }
  };

  return (
    <div>
      {/* <form> */}

      <Typography variant="h5">Enrollment & Student Management</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        fontStyle="italic"
        mb={2}
      >
        Simplify admissions, track student information, and manage class
        enrollments with an intuitive and centralized system.
      </Typography>

      <Stack spacing={2} py={2} justifyContent="center">
        <Autocomplete
          options={levels || []}
          value={level}
          onChange={(_, value) => setLevel(value)}
          getOptionLabel={(option) =>
            `${option?.name}${option?.type || ""}` || ""
          }
          isOptionEqualToValue={(option, value) =>
            option === value?.name ||
            value?.name === "" ||
            value?.name === null ||
            value?.name === undefined
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Level"
              // error={!!errors.students}
              // helperText={errors.students?.message}
            />
          )}
        />

        <Stack direction="row" justifyContent="flex-end">
          <Link
            sx={{ cursor: "pointer", alignSelf: "start" }}
            onClick={handleNext}
            variant="caption"
          >
            Skip for now
          </Link>
        </Stack>

        {level?.name && (
          <>
            <FormControl component="fieldset" error={!!errors.inputMethod}>
              <FormLabel>
                Choose how you want to add students to each level
              </FormLabel>
              <RadioGroup
                value={inputMethod}
                onChange={(event) => {
                  setInputMethod(event.target.value);
                }}
                row
              >
                <FormControlLabel
                  value="file"
                  control={<Radio />}
                  label="From File"
                />
                <FormControlLabel
                  value="autocomplete"
                  control={<Radio />}
                  label="From Previous Session"
                />
              </RadioGroup>
            </FormControl>

            {inputMethod === "file" && (
              <>
                <TextField
                  type="file"
                  accept=".csv,.xlsx"
                  label="Select Student List"
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  inputProps={{
                    accept: ".xlsx,.xls,.csv",
                  }}
                  fullWidth
                  onChange={handleFileChange}
                />

                <Link
                  sx={{ cursor: "pointer", alignSelf: "start" }}
                  onClick={handleDownloadTemplate}
                  variant="caption"
                >
                  Download Student template here
                </Link>
              </>
            )}
            {inputMethod === "autocomplete" && (
              <Stack spacing={2} py={2} justifyContent="center">
                <Autocomplete
                  options={previousSessions?.data}
                  noOptionsText="No Session not found"
                  closeText=""
                  clearText=" "
                  disableClearable={true}
                  fullWidth
                  value={session}
                  onChange={(e, value) => setSession(value)}
                  isOptionEqualToValue={(option, value) =>
                    value?._id === "" ||
                    value?._id === undefined ||
                    option._id === value?._id
                  }
                  getOptionLabel={(option) => option?.name || ""}
                  renderInput={(params) => (
                    <TextField {...params} label="Select  Session" />
                  )}
                />
                <Autocomplete
                  options={previousLevels?.data}
                  noOptionsText="No Level found!"
                  closeText=""
                  clearText=" "
                  disableClearable={true}
                  fullWidth
                  value={levelName}
                  onChange={(e, value) => {
                    setLevelName((prev) => {
                      return { ...prev, ...value };
                    });
                    setFile(value?.file);
                    setPreviewData(value?.data);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    value?._id === "" ||
                    value?._id === undefined ||
                    option._id === value?._id
                  }
                  getOptionLabel={(option) => option?.file || ""}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Level" />
                  )}
                />
              </Stack>
            )}

            <Button
              onClick={handleAddToList}
              variant="contained"
              color="primary"
              sx={{ alignSelf: "flex-start" }}
            >
              Add to List
            </Button>
          </>
        )}
      </Stack>
      {/* </form> */}
      {errors?.students && (
        <FormHelperText sx={{ color: "error.main" }}>
          {errors?.students
            ? errors?.students?.message
            : " Some Index numbers in the selected students list already exist.Please remove all duplicates before submitting the data."}
        </FormHelperText>
      )}
      {students.length > 0 && (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            py={2}
          >
            <h3>Selected Files</h3>

            <Button
              onClick={handleClearAll}
              variant="contained"
              color="secondary"
              style={{ marginTop: 10 }}
            >
              Clear All
            </Button>
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>New Level</TableCell>
                  <TableCell>File Name/ Previous Level</TableCell>
                  <TableCell>No of Students</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item?.class?.name}
                      {item?.class?.type}
                    </TableCell>
                    <TableCell>{item?.fileName}</TableCell>
                    <TableCell>{item?.data?.length}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenModal(index)}>
                        <PreviewIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteFile(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Preview Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            p: 4,
            bgcolor: "white",
            mx: "auto",
            mt: 5,
            width: "90%",
            borderRadius: 2,
          }}
        >
          <Typography variant="h6">
            {uploadedFiles[previewFileIndex]?.class?.name}
            {uploadedFiles[previewFileIndex]?.class?.type} (Total Rows:{" "}
            {filteredData?.length})
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search..."
            onChange={handleSearch}
            InputProps={{ startAdornment: <SearchIcon /> }}
            sx={{ my: 2 }}
          />
          <TableContainer
            component={Paper}
            sx={{ maxHeight: 500, overflow: "auto" }}
            onScroll={handleScroll}
            ref={previewTableRef}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {filteredData.length > 0 &&
                    Object.keys(filteredData[0]).map((col, i) => (
                      <TableCell key={i} sx={{ textTransform: "uppercase" }}>
                        {col}
                      </TableCell>
                    ))}
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.slice(0, visibleRows).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((val, j) => (
                      <TableCell
                        key={j}
                        // sx={{
                        //   color: duplicates?.includes(
                        //     row["indexnumber"]?.toString()
                        //   )
                        //     ? "rgba(255,0,0,0.8)"
                        //     : "none",
                        // }}
                      >
                        {val}
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton
                        onClick={() => handleDeleteRow(i, row["indexnumber"])}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Modal>
      {isLoading && <LoadingSpinner />}
    </div>
  );
};

export default Student;
