import React, { useContext, useState } from "react";
import Swal from "sweetalert2";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import AddSubject from "./AddSubject";
import { SUBJECT_COLUMNS } from "@/mockup/columns/sessionColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSubject, getSubjects } from "@/api/subjectAPI";
import { Stack } from "@mui/material";
import Edit from "@mui/icons-material/Edit";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import EditSubject from "./EditSubject";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { UserContext } from "@/context/providers/UserProvider";

function Subject() {
  const { session } = useContext(UserContext);
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const [openAddSubject, setOpenAddSubject] = useState(false);
  const handleOpen = () => setOpenAddSubject(true);

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () =>
      getSubjects({
        session: session?.sessionId,
        term: session?.termId,
      }),
    // initialData: [],
  });



  const updateSubject = (subject) => {
    schoolSessionDispatch({
      type: "editSubject",
      payload: { open: true, data: subject },
    });
  };

  const { isPending, mutate } = useMutation({
    mutationFn: deleteSubject,
  });
  const removeSubject = (id) => {
    Swal.fire({
      title: "Removing Subject",
      text: "Do you want to remove?",

      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(id, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
          },
          onSuccess: () => {
            schoolSessionDispatch(alertSuccess("Subject Removed!"));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const columns = [
    ...SUBJECT_COLUMNS,
    {
      title: "Action",
      field: null,
      render: (rowData) => {
        return (
          <Stack direction="row" spacing={2}>
            <Edit
              className="ico"
              onClick={() => updateSubject(rowData)}
              title="Edit"
              titleAccess="Edit"
            />
            <DeleteOutline
              className="ico"
              onClick={() => removeSubject(rowData?._id)}
              title="Delete"
              titleAccess="Delete"
            />
          </Stack>
        );
      },
    },
  ];

  return (
    <div>
      <CustomizedMaterialTable
        search
        title="Subjects"
        icon={EMPTY_IMAGES.subject}
        isPending={subjects.isPending}
        columns={columns}
        data={subjects?.data}
        actions={[]}
        showRowShadow={false}
        showAddButton={true}
        addButtonImg={EMPTY_IMAGES.session}
        addButtonMessage="😑 No Subjects system available!.Create a new one!"
        addButtonText="New Subject"
        onAddButtonClicked={handleOpen}
        handleRefresh={subjects.refetch}
        options={{
          paginationPosition: "bottom",
        }}
      />
      <AddSubject open={openAddSubject} setOpen={setOpenAddSubject} />
      <EditSubject />
      {isPending && <LoadingSpinner value="Removing Subject. Please Wait.." />}
    </div>
  );
}

export default Subject;
