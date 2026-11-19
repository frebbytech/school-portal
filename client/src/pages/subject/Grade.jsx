import React, { useContext, useState } from "react";
import Swal from "sweetalert2";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";

import AddGrade from "./AddGrade";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { deleteGrade, getGrades } from "@/api/gradeAPI";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import {  Link, Stack } from "@mui/material";
import { DeleteOutline, Edit } from "@mui/icons-material";
import ViewGrade from "./ViewGrade";
import EditGrade from "./EditGrade";
import AssignGrade from "./AssignGrade";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useSearchParams } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";

function Grade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openAddGrade, setOpenAddGrade] = useState(false);

  const queryClient = useQueryClient();
  const {
    session
  } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const grades = useQuery({
    queryKey: ["grades", session?.sessionId, session?.termId],
    queryFn: () => getGrades(session?.sessionId, session?.termId),
    enabled: !!session?.sessionId && !!session?.termId,
    // initialData: [],
  });

  const handleOpenAddGrade = () => setOpenAddGrade(true);

  const updateGrade = (grade) => {
    schoolSessionDispatch({
      type: "editGrade",
      payload: { open: true, data: grade },
    });
  };

  const viewGrade = (grade) => {
    schoolSessionDispatch({
      type: "viewGrade",
      payload: { open: true, data: grade },
    });
  };

  const handleOpenAssignGrade = (data) => {
    schoolSessionDispatch({
      type: "assignGrade",
      payload: { data },
    });
    setSearchParams((params) => {
      params.set("grade_id", data?._id);
      return params;
    });
  };
  const { isPending, mutate } = useMutation({
    mutationFn: deleteGrade,
  });

  const removeGrade = (id) => {
    Swal.fire({
      title: "Removing Grade",
      text: "Do you want to remove?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(id, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
          },
          onSuccess: () => {
            schoolSessionDispatch(alertSuccess("Grade Removed!"));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const columns = [
    {
      field: "_id",
      title: "ID",
      hidden: true,
    },
    {
      field: "name",
      title: "Name",
    },
    {
      field: "assignedLevels",
      title: "Assigned Levels",
      render: (rowData) => (
        <div
          style={{
            width: "300px",
          }}
        >
          {rowData?.assignedLevels?.map((level) => (
            <span
              key={level?._id}
              style={{
                textDecoration: "underline",
              }}
            >
              {level?.levelName}
              {" ,"}
            </span>
          ))}
        </div>
      ),
    },

    {
      title: "Action",
      field: null,
      render: (rowData) => {
        return (
          <Stack direction="row" spacing={2}>
            <Link
              sx={{
                color: "info.darker",
              }}
              onClick={() => viewGrade(rowData?.ratings)}
            >
              View
            </Link>
            <Link
              sx={{ cursor: "pointer" }}
              onClick={() => handleOpenAssignGrade(rowData)}
            >
              Assign
            </Link>

            <Edit
              className="ico"
              onClick={() => updateGrade(rowData)}
              title="Edit"
              titleAccess="Edit"
            />
            <DeleteOutline
              className="ico"
              onClick={() => removeGrade(rowData?._id)}
              title="Delete"
              titleAccess="Delete"
            />
          </Stack>
        );
      },
    },
  ];

  return (
    <>
      <CustomizedMaterialTable
        title="Grading System"
        icon={EMPTY_IMAGES.grade}
        isPending={grades.isPending}
        columns={columns}
        data={grades?.data}
        actions={[]}
        showAddButton={true}
        addButtonImg={EMPTY_IMAGES.session}
        addButtonMessage="😑 No Grading system available!.Create a new one!"
        addButtonText="New Grade"
        onAddButtonClicked={handleOpenAddGrade}
        handleRefresh={grades.refetch}
        options={{
          paginationPosition: "bottom",
        }}
      />

      <AddGrade open={openAddGrade} setOpen={setOpenAddGrade} />
      <ViewGrade />
      <EditGrade />
      <AssignGrade />
      {isPending && <LoadingSpinner value="Removing Grade. Please Wait.." />}
    </>
  );
}

export default Grade;
