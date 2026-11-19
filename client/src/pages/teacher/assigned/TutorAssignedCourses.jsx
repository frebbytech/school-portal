import { getAllCourseAssignedToTeacher } from "@/api/teacherAPI";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Container } from "@mui/material";
import CustomTitle from "@/components/custom/CustomTitle";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import QueryError from "@/components/QueryError";
import { TEACHER_ASSIGNED_COURSES_COLUMNS } from "@/mockup/columns/teacherColumn";

const TutorAssignedCourses = () => {
  //GET All Courses Assigned to Teacher
  const courses = useQuery({
    queryKey: ["teacher/courses"],
    queryFn: getAllCourseAssignedToTeacher,
  });

  return (
    <Container maxWidth="lg">
      <CustomTitle
        title="Assigned Courses Portal"
        subtitle="See which teacher takes each course in each class."
        // img={teacher_icon}
        color="primary.main"
      />

      {courses.isError && !courses.data && (
        <QueryError what="the assigned courses" error={courses.error} onRetry={courses.refetch} />
      )}

      <CustomizedMaterialTable
        title="Assigned Courses"
        // icon={teacher_icon}
        isPending={courses.isPending}
        columns={TEACHER_ASSIGNED_COURSES_COLUMNS}
        data={courses.data || []}
        actions={[]}
        options={{
          search: true,
        }}
        handleRefresh={courses?.refetch}
      />
    </Container>
  );
};

export default TutorAssignedCourses;
