import {
  Avatar,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import React, { use, useRef } from "react";
import _ from "lodash";
import MedicalAllergyItem from "@/components/items/MedicalAllergyItem";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { useReactToPrint } from "react-to-print";
import dayjs from "@/lib/dates";
import { SchoolRounded } from "@mui/icons-material";
import { UserContext } from "@/context/providers/UserProvider";
import StudentViewItem from "./StudentViewItem";
import { useNavigate } from "react-router-dom";
import { newStudentDefaultValues } from "@/config/initialValues";

function ConfirmStudent({ watch, isPending, id, hideSaveBtn, reset }) {
  const { personal, photo, medical, parent, academic } = watch();
  const { school_info } = use(UserContext);
  const componentRef = useRef();
  const navigate = useNavigate();

  const reactToPrintFn = useReactToPrint({
    documentTitle: `Admission Form - ${personal?.surname} ${personal?.firstname} ${personal?.othername}`,
    contentRef: componentRef,
    onAfterPrint: () => {
      reset(newStudentDefaultValues);
      localStorage.removeItem("active-add-student");
    },
  });

  const legendStyle = {
    width: "100%",
    // borderBottom: "1px solid black",
    backgroundColor: "var(--primary)",
    color: "#fff",
    padding: "2px",
    fontSize: 12,
  };

  return (
    <Container>
      <CustomDialogTitle
        title="Admission Form"
        subtitle="Preview of student information. Please check before saving your information."
      />
      <Container
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "center",
          alignItems: "center",
          py: 2,
        }}
      >
        {!id && (
          <Button
            loading={isPending}
            variant="contained"
            color="primary"
            type="submit"
          >
            Save Student
          </Button>
        )}
        {hideSaveBtn && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={() => reactToPrintFn()}
            >
              Print Form
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={() => {
                navigate(`/student/view/${id}?_l=${academic?.level?._id}`);
                reset(newStudentDefaultValues);
                localStorage.removeItem("active-add-student");
              }}
            >
              View Student
            </Button>
          </>
        )}
      </Container>

      <Box
        sx={{
          // width: "8.5in",
          height: "11in",
          overflowY: "auto",
        }}
      >
        <div ref={componentRef}>
          {/* school details */}

          <Stack
            // direction="row"
            justifyContent="center"
            alignItems="center"
            sx={{
              maxWidth: "8.5in",
              minHeight: "11in",
              margin: "auto",
              padding: "16px",
              border: "1px solid lightgray",
              position: "relative",
              backgroundSize: "contain",
              backgroundPosition: "center center !important",
            }}
          >
            <Typography variant="h5" sx={{ justifySelf: "start", py: 4 }}>
              Admission Form
            </Typography>
            {school_info?.badge ? (
              <Avatar
                alt="school logo"
                loading="lazy"
                srcSet={school_info?.badge}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                }}
              >
                {school_info?.name[0]}
              </Avatar>
            ) : (
              <SchoolRounded sx={{ width: 100, height: 100 }} />
            )}
            <Stack
              justifyContent="center"
              alignItems="center"
              width="100%"
              pt={2}
            >
              <Typography variant="h4">
                {_.upperCase(school_info?.name)}
              </Typography>
              <Typography variant="caption">{school_info?.address}</Typography>
              <Typography variant="caption">{school_info?.location}</Typography>
              <Typography variant="caption" fontStyle="italic">
                {school_info?.motto}
              </Typography>
            </Stack>
            <Typography variant="h3" textTransform="uppercase" my={2}>
              {`${personal?.surname} ${personal?.firstname} ${personal?.othername}`}
            </Typography>
          </Stack>
          <Stack
            className="admission-form"
            spacing={1}
            sx={{
              maxWidth: "8.5in",
              minHeight: "11in",
              margin: "auto",
              padding: "16px",
              border: "1px solid lightgray",
              position: "relative",
              backgroundSize: "contain",
              backgroundPosition: "center center !important",
            }}
            // style={style}
          >
            {id && (
              <small
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: 0,
                  paddingRight: "8px",
                  paddingBottom: "8px",
                }}
              >
                {id}
              </small>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Avatar
                variant="square"
                src={photo?.display}
                sx={{ alignSelf: "center", width: 80, height: 80 }}
              />
            </div>

            {/* Personal Information  */}
            <div style={{ paddingBottom: "8px" }}>
              <legend style={legendStyle}>Personal Data</legend>
              <StudentViewItem
                secondary="Student ID"
                primary={personal?.indexnumber}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                }}
              >
                <StudentViewItem
                  secondary="Full Name"
                  primary={`${personal?.surname} ${personal?.firstname} ${personal?.othername}`}
                />

                <StudentViewItem
                  secondary="Date of Birth"
                  primary={dayjs(personal?.dateofbirth).format("LL")}
                />
                <StudentViewItem
                  secondary="Gender"
                  primary={_.capitalize(personal?.gender)}
                />
                <StudentViewItem
                  secondary="Email Address"
                  primary={personal?.email}
                />
                <StudentViewItem
                  secondary="Phone Number"
                  primary={personal?.phonenumber}
                />
                <StudentViewItem
                  secondary="Residence"
                  primary={personal?.residence}
                />
                <StudentViewItem
                  secondary="Nationality"
                  primary={personal?.nationality}
                />
                <StudentViewItem
                  secondary="Address"
                  primary={personal?.address}
                />
              </div>
            </div>
            {/* Parent Information  */}
            <div style={{ paddingBottom: "8px" }}>
              <legend style={legendStyle}>Parent/Guardian Information</legend>

              {parent?.map((p, index) => {
                return (
                  <Stack key={index}>
                    <Typography
                      color="primary.main"
                      sx={{ fontWeight: "bold", fontSize: 11 }}
                    >
                      Parent / Guardian
                    </Typography>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(260px,1fr))",
                      }}
                    >
                      <StudentViewItem
                        secondary="Surname"
                        primary={p?.surname}
                      />
                      <StudentViewItem
                        secondary="First Name"
                        primary={p?.firstname}
                      />
                      <StudentViewItem
                        secondary="Relationship"
                        primary={p?.relationship}
                      />

                      <StudentViewItem
                        secondary="Gender"
                        primary={_.capitalize(p?.gender)}
                      />
                      <StudentViewItem
                        secondary="Email Address"
                        primary={p?.email}
                      />
                      <StudentViewItem
                        secondary="Phone Number"
                        primary={p?.phonenumber}
                      />

                      <StudentViewItem
                        secondary="Residence"
                        primary={p?.residence}
                      />
                      <StudentViewItem
                        secondary="Nationality"
                        primary={p?.nationality}
                      />
                      <StudentViewItem
                        secondary="Address"
                        primary={p?.address}
                      />
                    </div>
                  </Stack>
                );
              })}
            </div>

            {/* Medical Information  */}
            <div style={{ paddingBottom: "8px" }}>
              <legend style={legendStyle}>Medical Records</legend>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                }}
              >
                <MedicalAllergyItem
                  title="1. Heart Disease"
                  value={medical.heartDisease}
                />
                <MedicalAllergyItem title="2. Asthma" value={medical.asthma} />
                <MedicalAllergyItem
                  title="3. Siezures"
                  value={medical.seizures}
                />
                <MedicalAllergyItem
                  title="4. Visual Impairment"
                  value={medical.visualImpairment}
                />

                <MedicalAllergyItem
                  title="5. Hearing Impairment"
                  value={medical.hearingImpairment}
                />

                <MedicalAllergyItem
                  title="6. Physical Disability"
                  value={medical.physicalDisability}
                />
              </div>
              <Typography
                color="primary.main"
                sx={{ fontWeight: "bold", fontSize: 11 }}
              >
                Emergency Contact
              </Typography>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                }}
              >
                <StudentViewItem
                  secondary="Fullname"
                  primary={medical?.emergencyContact?.fullname}
                />
                <StudentViewItem
                  secondary="Phone Number"
                  primary={medical?.emergencyContact?.phonenumber}
                />
                <StudentViewItem
                  secondary="Address"
                  primary={medical?.emergencyContact?.address}
                />
              </div>
            </div>
            {/* Academic Information  */}
            <div style={{ paddingBottom: "8px" }}>
              <legend style={legendStyle}>Academic Records</legend>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                }}
              >
                <StudentViewItem
                  secondary="Department"
                  primary={academic?.department?.name}
                />
                <StudentViewItem
                  secondary="Current Level"
                  primary={academic?.level?.type}
                />
                <StudentViewItem
                  secondary="House/Section"
                  primary={academic?.house?.name}
                />

                <StudentViewItem
                  secondary="Previous School Name"
                  primary={academic?.previousSchool?.name}
                />
                <StudentViewItem
                  secondary="Location"
                  primary={academic?.previousSchool?.location}
                />
              </div>
            </div>
          </Stack>
        </div>
      </Box>
    </Container>
  );
}

export default ConfirmStudent;
