import React from "react";
import { Box, Container, Divider, IconButton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { RECENT_STUDENTS_COLUMN } from "@/mockup/columns/studentColumns";
import StudentDashboardBarChart from "@/components/cards/StudentDashboardBarChart";
import StudentDashboardPieChart from "@/components/cards/StudentDashboardPieChart";
import { getAllStudentsDetails } from "@/api/studentAPI";
import StudentDashboardLineChart from "@/components/cards/StudentDashboardLineChart";
import student_icon from "@/assets/images/header/student_ico.svg";
import { EMPTY_IMAGES } from "@/config/images";
import ChartSkeleton from "@/components/skeleton/ChartSkeleton";
import CustomTitle from "@/components/custom/CustomTitle";
import DashboardCard from "@/components/cards/DashboardCard";
import { Person, Refresh } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import QueryError from "@/components/QueryError";

const StudentHome = () => {
  const { session } = useAuth();

  const studentDetails = useQuery({
    queryKey: ["student-details", session?.sessionId, session?.termId],
    queryFn: () =>
      getAllStudentsDetails({
        sessionId: session.sessionId,
        termId: session.termId,
      }),
    enabled: !!session.sessionId && !!session.termId,
    initialData: {
      recentStudents: [],
      noOfStudentsInEachLevel: [],
      noOfStudentsForEachTerm: [],
      students: 0,
      males: 0,
      females: 0,
    },
  });

  return (
    <Container>
      <CustomTitle
        title="Student Portal"
        subtitle="Add, edit, and view student records to keep accurate and up-to-date information on all students."
        img={student_icon}
        color="primary.main"
        right={
          <IconButton aria-label="Refresh" onClick={() => studentDetails.refetch()}>
            <Refresh sx={{ width: 36, height: 36 }} />
          </IconButton>
        }
      />
      {studentDetails.isError && (
        <QueryError error={studentDetails.error} onRetry={studentDetails.refetch} what="the student summary" />
      )}
      <Typography variant="h5" py={2}>
        Student Details Summary
      </Typography>
      <Divider />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: 2,
          pt: 2,
        }}
      >
        <DashboardCard
          title="Students"
          value={studentDetails.data?.students}
          icon={
            <IconButton sx={{ bgcolor: "secondary.lighter" }}>
              <Person
                sx={{
                  width: 20,
                  height: 20,
                  color: "secondary.darker",
                }}
              />
            </IconButton>
          }
        />
        <DashboardCard
          title="Males"
          value={studentDetails.data?.males}
          icon={
            <IconButton sx={{ bgcolor: "warning.lighter" }}>
              <Person
                sx={{
                  width: 20,
                  height: 20,
                  color: "warning.darker",
                }}
              />
            </IconButton>
          }
        />

        <DashboardCard
          title="Females"
          value={studentDetails.data?.females}
          icon={
            <IconButton sx={{ bgcolor: "info.lighter" }}>
              <Person
                sx={{
                  width: 20,
                  height: 20,
                  color: "info.darker",
                }}
              />
            </IconButton>
          }
        />
      </Box>
      <Typography variant="h5" py={2}>
        Chart History
      </Typography>
      <Divider />
      {studentDetails.isPending && <ChartSkeleton />}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 2,
          py: 2,
        }}
      >
        <StudentDashboardBarChart
          data={studentDetails?.data?.noOfStudentsForEachTerm}
        />

        <StudentDashboardPieChart {...studentDetails?.data} />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(1fr,1fr))",
        }}
      >
        <StudentDashboardLineChart
          data={studentDetails?.data?.noOfStudentsInEachLevel}
          academicYear={`${session?.academicYear},${session?.term}`}
        />
      </Box>

      {/* <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "center",
          pt: 3,
          gap: 2,
        }}
      > */}
      {/* <CustomizedMaterialTable
          title="Recently Added Students"
          icon={student_icon}
          isPending={studentDetails.isPending}
          columns={[
            {
              title: "Level",
              field: "level",
            },
            {
              title: "Students",
              field: "students",
            },
          ]}
          options={{
            paginationPosition: "bottom",
            pageSize: 3,
            selection: false,
            toolbar: false,
            paging: false,
          }}
          data={studentDetails?.data?.noOfStudentsInEachLevel ?? []}
          actions={[]}
          handleRefresh={studentDetails.refetch}
          addButtonImg={EMPTY_IMAGES.student}
          addButtonMessage="😑 No Students recently added !!!!"
          style={{
            border: "none",
            boxShadow: "0px 1px 5px rgba(0,0,0,0.07)",
          }}
        /> */}

      <CustomizedMaterialTable
        title="Recently Added Students"
        icon={student_icon}
        isPending={studentDetails.isPending}
        columns={RECENT_STUDENTS_COLUMN}
        options={{
          paginationPosition: "bottom",
          pageSize: 3,
          selection: false,
          // toolbar: false,
          paging: false,
        }}
        data={studentDetails?.data?.recentStudents}
        actions={[]}
        handleRefresh={studentDetails.refetch}
        addButtonImg={EMPTY_IMAGES.student}
        addButtonMessage="😑 No Students recently added !!!!"
        style={{
          border: "none",
          boxShadow: "0px 1px 5px rgba(0,0,0,0.07)",
        }}
      />
      {/* </Box> */}
    </Container>
  );
};

export default StudentHome;
