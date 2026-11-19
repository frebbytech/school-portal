import React, { useState } from "react";
import { Button, Container } from "@mui/material";
import CustomTitle from "@/components/custom/CustomTitle";
import useLevel from "@/components/hooks/useLevel";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { TEACHER_ASSIGNED_LEVELS_COLUMNS } from "@/mockup/columns/teacherColumn";
import _ from "lodash";

import AssignTutorLevel from "./AssignTutorLevel";
import QueryError from "@/components/QueryError";
import { EMPTY_IMAGES } from "@/config/images";
const TutorAssignedLevels = () => {
  const [open, setOpen] = useState(false);
  //GET All Courses Assigned to Teacher
  const { levelsOption, levelLoading, levelRefetch, levelError } = useLevel();

  const levels = levelsOption?.map((level) => {
    if (_.isEmpty(level?.teacher)) return;
    return {
      _id: level?._id,
      level: level?.type,
      teacher: level?.teacher,
      noOfSubjects: level?.noOfSubjects,
      noOfStudents: level?.noOfStudents,
    };
  });
  const assignedLevels = _.compact(levels);

  const handleOpenAssignTeacher = () => {
    setOpen(true);
  };

  return (
    <Container maxWidth="lg">
      <CustomTitle
        title="Assigned Levels Portal"
        subtitle="Explore Our Faculty: Meet the Dedicated Educators Shaping Tomorrow's Leaders"
        // img={teacher_icon}
        color="primary.main"
      />

      {levelError && (
        <QueryError what="the classes" error={levelError} onRetry={levelRefetch} />
      )}

      <CustomizedMaterialTable
        title="Assigned Levels"
        subtitle="Manage Levels Assigned to Tutors"
        showAddButton={true}
        addButtonImg={EMPTY_IMAGES.teacher}
        addButtonText="Assign Level"
        addButtonMessage="😑 Assign Levels to Teachers to Manage Their Classes Effectively."
        onAddButtonClicked={handleOpenAssignTeacher}
        isPending={levelLoading}
        columns={TEACHER_ASSIGNED_LEVELS_COLUMNS}
        data={assignedLevels}
        actions={[]}
        options={{
          search: true,
        }}
        handleRefresh={levelRefetch}
      />

      <AssignTutorLevel open={open} setOpen={setOpen} />
    </Container>
  );
};

export default TutorAssignedLevels;
