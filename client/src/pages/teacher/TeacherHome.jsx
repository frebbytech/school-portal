import React, { useState } from "react";
import { Add, PersonRounded } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Container, Tab } from "@mui/material";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import TeacherAdd from "./TeacherAdd";
import { TEACHERS_COLUMN } from "@/mockup/columns/teacherColumn";
import { useQuery } from "@tanstack/react-query";
import { getAllTeachers } from "@/api/teacherAPI";
import { EMPTY_IMAGES } from "@/config/images";
import teacher_icon from "@/assets/images/header/teacher_ico.svg";
import CustomTitle from "@/components/custom/CustomTitle";
import { useNavigate } from "react-router-dom";
import QueryError from "@/components/QueryError";

const TeacherHome = () => {
  const [tab, setTab] = useState("1");
  const navigate = useNavigate();

  //GET All Teachers
  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: getAllTeachers,
  });

  const isNotTeacher = teachers?.data?.length === 0;

  //VIEW Teacher Info
  const viewTeacherInfo = (data) => {
    navigate(`/teacher/${data?._id}`);
  };

  return (
    <Container maxWidth="lg">
      <CustomTitle
        title="Facilitator Portal"
        subtitle="Explore Our Faculty: Meet the Dedicated Educators Shaping Tomorrow's Leaders"
        img={teacher_icon}
        color="primary.main"
      />

      <TabContext value={tab}>
        <TabList
          onChange={(e, value) => setTab(value)}
          sx={{ bgcolor: "whitesmoke" }}
        >
          <Tab
            value="1"
            label="Facilitator"
            icon={<PersonRounded />}
            iconPosition="start"
          />
          {isNotTeacher && (
            <Tab value="2" label="New " icon={<Add />} iconPosition="start" />
          )}
        </TabList>

        <TabPanel value="1" sx={{ px: 0 }}>
          {teachers.isError && !teachers.data && (
            <QueryError what="the teachers" error={teachers.error} onRetry={teachers.refetch} />
          )}
          <CustomizedMaterialTable
            title="Teachers"
            icon={teacher_icon}
            isPending={teachers.isPending || teachers.isLoading}
            columns={TEACHERS_COLUMN}
            data={teachers.data || []}
            actions={[]}
            onRowClick={viewTeacherInfo}
            showAddButton={true}
            addButtonImg={EMPTY_IMAGES.teacher}
            addButtonText="New Teacher"
            addButtonMessage="😑 Add your first teacher by clicking on the button below !"
            onAddButtonClicked={() => setTab("2")}
            options={{
              search: true,
            }}
            handleRefresh={teachers?.refetch}
          />
        </TabPanel>
        <TabPanel value="2" sx={{ px: 0 }}>
          <TeacherAdd setTab={setTab} />
        </TabPanel>
      </TabContext>
    </Container>
  );
};

export default TeacherHome;
