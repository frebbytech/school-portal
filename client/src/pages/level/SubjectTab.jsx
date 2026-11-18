import { useState } from "react";
import { Add, CheckCircleRounded } from "@mui/icons-material";
import {
  Alert,
  Button,
  Container,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import _ from "lodash";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import CustomizedTable from "@/components/tables/CustomizedTable";
import { deleteSubject, getAllSubjects } from "@/api/subjectAPI";
import AddSubject from "@/components/modals/AddSubject";
import { SCHOOl_SUBJECTS } from "@/mockup/columns/sessionColumns";
const SubjectTab = () => {
  const queryClient = useQueryClient();
  const [openAddSubject, setOpenAddSubject] = useState(false);

  const [msg, setMsg] = useState({
    severity: "",
    text: "",
  });

  const subjects = useQuery({
    queryKey: ["subject"],
    queryFn: getAllSubjects,
  });

  const { mutate } = useMutation({ mutationFn: deleteSubject });

  const handleDeleteLevel = (id) => {
    Swal.fire({
      title: "Removing",
      text: "Do you want to remove?",

      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(id, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["level"] });
          },
          onSuccess: () => {
            setMsg({
              severity: "info",
              text: "Level has been removed successfully!!!",
            });
          },
          onError: (error) => {
            setMsg({
              severity: "error",
              text: "Error removing Level!!!",
            });
          },
        });
      }
    });
  };

  const options = {
    responsive: "standard",
    filter: true,
    selectableRows: "multiple",
    filterType: "dropdown",
    fixedHeader: true,
    fixedSelectColumn: true,
    elevation: 0,
    rowsPerPage: 3,
    rowsPerPageOptions: [3, 6, 9],
  };

  const newColumns = [
    ...SCHOOl_SUBJECTS,
    {
      name: "option",
      label: "Option",
      options: {
        empty: true,
        customBodyRender: (value, { rowData }) => (
          <Stack direction="row" spacing={2}>
            <Link
              sx={{ cursor: "pointer" }}
              onClick={() => handleDeleteLevel(rowData[0])}
            >
              Remove
            </Link>
          </Stack>
        ),
      },
    },
  ];

  return (
    <>
      {msg.text && (
        <Alert
          sx={{
            marginY: 1,
          }}
          icon={<CheckCircleRounded />}
          severity={msg.severity}
          onClose={() =>
            setMsg({
              text: "",
            })
          }
        >
          {msg.text}
        </Alert>
      )}
      <Container>
        <Stack
          spacing={1}
          direction={{ xs: "column", sm: "row" }}
          justifyContent={{ xs: "center", sm: "space-between" }}
          alignItems="center"
        >
          <Typography variant="h5">Class Subjects</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddSubject(true)}
          >
            New Subject
          </Button>
        </Stack>
        <CustomizedTable
          columns={newColumns}
          data={subjects.data}
          options={options}
        />
      </Container>

      <AddSubject open={openAddSubject} setOpen={setOpenAddSubject} />
    </>
  );
};

export default SubjectTab;
