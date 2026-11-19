import {
  Box,
  Button,
  FormHelperText,
  Stack,
  TextField,
  Typography,
  Container,
  MenuItem,
  Link,
  Autocomplete,
} from "@mui/material";
import React, { useContext, useState } from "react";
import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import Swal from "sweetalert2";
import { useDropzone } from "react-dropzone";
import _ from "lodash";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { Add, AddAPhoto, UploadFileRounded } from "@mui/icons-material";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES, IMAGES } from "@/config/images";
import { UserContext } from "@/context/providers/UserProvider";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { Formik } from "formik";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { downloadTemplate } from "@/api/userAPI";
import { switchColumns } from "@/config/columns";
import { putBulkData } from "@/api/sessionAPI";
import useLevel from "@/components/hooks/useLevel";
import { DATA_HEADERS } from "@/mockup/columns/sessionColumns";
import { validateExcelHeaders } from "@/config/helper";

const Uploads = () => {
  const CSV_FILE_TYPE = "text/csv";
  const XLSX_FILE_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const XLS_FILE_TYPE = "application/vnd.ms-excel";

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { session } = useContext(UserContext);
  const navigate = useNavigate();
  const { state } = useLocation();
  const [levelValue, setLevelValue] = useState({ _id: "", type: "" });
  const [dataCategory, setDataCategory] = useState("students");
  const [dataType, setDataType] = useState("personal-data");
  const [gradeName, setGradeName] = useState("");
  const [bulkData, setBulkData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mainError, setMainError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  //Get All levels
  const { levelsOption } = useLevel();

  const { getRootProps, getInputProps, open, acceptedFiles } = useDropzone({
    // Disable click and keydown behavior
    noClick: true,
    noKeyboard: true,
    maxFiles: 10,
    accept:
      dataType === "personal-data"
        ? {
            "text/csv": [".csv"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              [".xlsx"],
          }
        : {
            "image/*": [".jpeg", ".png", ".webp"],
          },
    maxSize: 200000,
    multiple: true,
    onDrop: (acceptedFiles) => {
      if (!_.isEmpty(acceptedFiles)) {
        if (dataType === "personal-data") {
          handleLoadFile(acceptedFiles[0]);
        }

        if (dataType === "photos") {
          handleLoadImages(acceptedFiles);
        }
      } else {
        setMainError("No files selected");
      }
    },
  });

  const fileType = acceptedFiles[0]?.type;

  const initialValues = {
    dataCategory,
    dataType,
    levelValue,
    data: bulkData,
    gradeName,
  };

  //LOAD Results from file excel,csv
  async function handleLoadFile(files) {
    setMainError("");
    setIsLoading(true);
    let headers = [];
    switch (dataCategory) {
      case "students":
        headers = DATA_HEADERS.STUDENTS;
        break;
      case "teachers":
        headers = DATA_HEADERS.TEACHERS;
        break;
      case "subjects":
        headers = DATA_HEADERS.SUBJECTS;
        break;
      case "grades":
        headers = DATA_HEADERS.GRADES;
        break;
      default:
        headers = [];
    }

    const result = await validateExcelHeaders(files, headers);

    if (!result.valid) {
      setMainError(
        `Invalid file headers.Expected headers: [${headers.join(", ")}].`
      );
      setIsLoading(false);
      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = async function (event) {
        // setLoadingData(true);
        const binaryStr = event.target?.result;
        if (binaryStr) {
          const workbook = XLSX.read(binaryStr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          // Function to filter out empty or undefined rows
          const filteredData = jsonData.filter((row) =>
            Object.values(row).some(
              (value) => value !== undefined && value !== ""
            )
          );

          const headers = filteredData[0].map((header) => _.camelCase(header));
          const rows = filteredData.slice(1);

          const results = rows.map((row) => {
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            return rowData;
          });

          setBulkData([]);
          if (dataCategory === "grades") {
            const modifiedResults = results?.map((result) => {
              return {
                id: uuid(),
                ...result,
              };
            });

            setBulkData(modifiedResults);
            return;
          }
          if (dataCategory === "subjects") {
            const modifiedResults = results?.map((result) => {
              return {
                ...result,
                isCore: ["Yes", "True", true].includes(result?.isCore)
                  ? true
                  : false,
              };
            });
            setBulkData(modifiedResults);
            return;
          }
          setBulkData(results);
        }
      };
      reader.readAsBinaryString(files);
    } catch (error) {
      setMainError(error);
    } finally {
      setIsLoading(false);
    }
  }
  //LOAD Photos
  function handleLoadImages(imagefiles) {
    const files = Array.from(imagefiles);

    setBulkData([]);
    setBulkData(files);

    // const imagePromises = files.map(async (file) => {
    //   const src = () =>
    //     new Promise((resolve, reject) => {
    //       const reader = new FileReader();

    //       reader.onload = (event) => {
    //         resolve(event.target.result);
    //       };

    //       reader.onerror = (error) => {
    //         reject(error);
    //       };

    //       reader.readAsDataURL(file);
    //     });
    //   const imageSrc = await src();

    //   return {
    //     id: file.name?.split(".")[0],
    //     src: imageSrc,
    //   };
    // });

    // Promise.all(imagePromises)
    //   .then((imagesDataUrls) => {
    //     setBulkData([]);
    //     setBulkData(imagesDataUrls);
    //   })
    //   .catch((error) => {
    //     console.error("Error reading files: ", error);
    //   })
    //   .finally(() => {
    //     // setLoadingData(false);
    //   });
  }

  const { mutate, isPending } = useMutation({
    mutationFn: putBulkData,
  });

  const onSubmit = () => {
    Swal.fire({
      title: "Importing results",
      text: `You are about to import ${dataCategory} data.Proceed with import?`,
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        let payload;

        if (["students", "teachers"].includes(dataCategory)) {
          payload = {
            dataCategory,
            dataType,
            data: {
              session: {
                sessionId: session?.sessionId,
                termId: session?.termId,
                levelId: levelValue?._id,
              },
              students: bulkData,
              type: "file",
            },
          };
        }

        if (dataCategory === "grades") {
          payload = {
            dataCategory,
            dataType,
            data: {
              session: session?.sessionId,
              term: session?.termId,
              name: gradeName,
              ratings: bulkData,
            },
          };
        }
        if (dataCategory === "subjects") {
          payload = {
            dataCategory,
            dataType,
            data: {
              session: session?.sessionId,
              term: session?.termId,
              subjects: bulkData,
            },
          };
        }

        mutate(
          {
            ...payload,
            onProgress: setUploadProgress,
          },
          {
            onSuccess: (data) => {
              setUploadProgress(0);
              schoolSessionDispatch(alertSuccess(data));
              setBulkData([]);
              navigate(state?.prevPath);
            },
            onError: (error) => {
              if (error?.isDuplicateError) {
                Swal.fire({
                  title: error?.isTeacher
                    ? "Duplicate Usernames found!"
                    : "Duplicate Students ID found!",
                  icon: "error",
                  html: `<div> ${error?.message} ${JSON.stringify(
                    error?.data
                  )} </div>`,
                  showCancelButton: false,
                  backdrop: false,
                });
              } else {
                schoolSessionDispatch(alertError(error));
              }
            },
          }
        );
      }
    });
  };

  const handleDownloadTemplate = async () => {
    await downloadTemplate(dataCategory);
  };

  //CLOSE File Dialog
  const handleCancelUploads = () => {
    Swal.fire({
      title: "Cancel Uploads",
      text: "Unsaved Changes will be lost. Are you sure?",
      showCancelButton: true,
      allowOutsideClick: () => false,
      closeOnClickOutside: false,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        setDataCategory("students");
        setDataType("personal-data");
        setBulkData([]);
      }
    });
  };

  const columns = switchColumns(dataCategory);

  return (
    <Container>
      <CustomTitle
        title="Data Uploads (Bulk Data Management)"
        subtitle="Upload large sets of data, such as student information,teacher information,subjects, grades, and attendance records, to streamline data entry and management processes."
        color="primary.main"
      />

      <Formik
        initialValues={initialValues}
        onSubmit={onSubmit}
        enableReinitialize={true}
        // validationSchema={eventValidationSchema}
      >
        {({ errors, touched, handleSubmit }) => {
          return (
            <>
              {/* {uploadProgress !== null && (
                <div>
                  <progress value={uploadProgress} max="100"></progress>
                  <p>{uploadProgress}% uploaded</p>
                </div>
              )} */}
              <Stack
                spacing={2}
                py={4}
                px={2}
                my={4}
                // border="1px solid lightgray"
                bgcolor="#fff"
                borderRadius="12px"
              >
                <Typography>
                  Select an <b>EXCEL</b> OR <b>CSV</b> file containing student
                  the data. Make sure the <b>columns</b> matches the accepted
                  fields. You can download a <b>sample template</b> for your
                  data.
                </Typography>
                <>
                  <Stack py={2}>
                    <CustomFormControl>
                      <div style={{ width: "inherit" }}>
                        <TextField
                          label="Choose Data Category"
                          select
                          fullWidth
                          size="small"
                          value={dataCategory}
                          onChange={(e) => {
                            setDataCategory(e.target.value);
                            setBulkData([]);
                          }}
                          error={Boolean(
                            touched.dataCategory && errors.dataCategory
                          )}
                          helperText={
                            touched.dataCategory && errors.dataCategory
                          }
                        >
                          <MenuItem value="students">Students</MenuItem>
                          <MenuItem value="teachers">Teachers</MenuItem>
                          <MenuItem value="subjects">Subjects</MenuItem>
                          <MenuItem value="grades">Grades</MenuItem>
                        </TextField>
                      </div>
                      {dataCategory === "students" && (
                        <Autocomplete
                          size="small"
                          fullWidth
                          options={levelsOption}
                          noOptionsText="No Level available"
                          getOptionLabel={(option) => option.type || ""}
                          isOptionEqualToValue={(option, value) =>
                            value._id === undefined ||
                            value._id === "" ||
                            value._id === option._id
                          }
                          value={levelValue}
                          onChange={(e, value) => setLevelValue(value)}
                          renderInput={(params) => (
                            <TextField
                              fullWidth
                              {...params}
                              label="Select Level"
                              size="small"
                              error={Boolean(
                                touched.levelValue?._id &&
                                  errors.levelValue?._id
                              )}
                              helperText={
                                touched.levelValue?._id &&
                                errors.levelValue?._id
                              }
                              required
                              FormHelperTextProps={{
                                sx: {
                                  color: "error.main",
                                },
                              }}
                            />
                          )}
                        />
                      )}

                      {["students", "teachers"].includes(dataCategory) && (
                        <TextField
                          label="Choose Data Type to Upload"
                          select
                          fullWidth
                          size="small"
                          value={dataType}
                          onChange={(e) => setDataType(e.target.value)}
                          error={Boolean(touched.dataType && errors.dataType)}
                          helperText={touched.dataType && errors.dataType}
                        >
                          <MenuItem value="personal-data">
                            Personal Data
                          </MenuItem>
                          <MenuItem value="photos">Photos</MenuItem>
                        </TextField>
                      )}
                      {dataCategory === "grades" && (
                        <TextField
                          label="Name of Grade System"
                          fullWidth
                          size="small"
                          value={gradeName}
                          onChange={(e) => setGradeName(e.target.value)}
                          error={Boolean(touched.gradeName && errors.gradeName)}
                          helperText={touched.gradeName && errors.gradeName}
                        />
                      )}
                    </CustomFormControl>
                    {(dataType === "personal-data" ||
                      ["grades", "subjects"].includes(dataCategory)) && (
                      <Link
                        sx={{ cursor: "pointer", display: "block" }}
                        onClick={handleDownloadTemplate}
                        variant="caption"
                      >
                        Download {dataCategory} template here
                      </Link>
                    )}
                  </Stack>

                  <Box pt={2}>
                    <Stack
                      border="1px dotted #333"
                      p={2}
                      {...getRootProps({ className: "dropzone" })}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <input {...getInputProps()} />
                      {fileType === CSV_FILE_TYPE ? (
                        <img
                          alt="csv file"
                          src={IMAGES.csv}
                          style={{ width: 48, height: 48 }}
                        />
                      ) : [XLSX_FILE_TYPE, XLS_FILE_TYPE].includes(fileType) ? (
                        <img
                          alt="excel file"
                          src={IMAGES.excel}
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <Add
                          sx={{ width: 36, height: 36, alignSelf: "center" }}
                        />
                      )}

                      <Typography variant="body2" textAlign="center" pt={4}>
                        Drag & drop your{" "}
                        {dataType === "personal-data" ? "data File" : "photos"}{" "}
                        here
                      </Typography>
                      {dataType === "photos" && (
                        <small
                          style={{
                            color: "red",
                            paddingBottom: "4px",
                          }}
                        >
                          (You can upload up to 10 photos at time)
                        </small>
                      )}
                      <Button
                        variant="outlined"
                        onClick={open}
                        startIcon={
                          dataType === "personal-data" ? (
                            <UploadFileRounded />
                          ) : (
                            <AddAPhoto />
                          )
                        }
                      >
                        Upload{" "}
                        {dataType === "personal-data" ? "File" : "Photos"}
                      </Button>
                    </Stack>
                    {/* {touched.album && errors.album && (
                  <FormHelperText
                    sx={{
                      color: "#B72136",
                    }}
                  >
                    {errors.album}
                  </FormHelperText>
                )} */}
                  </Box>
                </>
              </Stack>
              {bulkData?.length > 0 && (
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  width="100%"
                  gap={2}
                >
                  <Button onClick={handleCancelUploads}>Cancel</Button>
                  <Button variant="contained" onClick={handleSubmit}>
                    Import {dataCategory || "Data"}
                  </Button>
                </Stack>
              )}
            </>
          );
        }}
      </Formik>

      <>
        {mainError && (
          <FormHelperText sx={{ color: "red" }}>{mainError}</FormHelperText>
        )}

        {dataType === "personal-data" ? (
          <CustomizedMaterialTable
            icon={EMPTY_IMAGES.score}
            search={true}
            // isPending={isPending}
            title={_.upperCase(dataCategory)}
            columns={columns}
            data={bulkData}
            actions={[]}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              // gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))",
              gap: 2,
              py: 4,
              width: "100%",
            }}
          >
            {bulkData?.map((image) => {
              return (
                <Stack
                  key={image?.name}
                  border="1px solid #ccc"
                  alignItems="center"
                  p={1}
                  spacing={1}
                >
                  <img
                    src={URL.createObjectURL(image)}
                    style={{
                      width: 80,
                      height: 80,
                    }}
                  />
                  <Typography variant="caption">{image?.name}</Typography>
                </Stack>
              );
            })}
          </Box>
        )}
      </>

      {(isPending || isLoading) && (
        <LoadingSpinner
          value={
            isPending ? `Please Wait..${uploadProgress}%` : "Please Wait.."
          }
        />
      )}
    </Container>
  );
};

export default Uploads;
