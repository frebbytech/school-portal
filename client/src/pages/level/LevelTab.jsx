import React, { use, useState } from "react";
import { Box, Button, Link, Stack } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import _ from "lodash";
import AddLevel from "./AddLevel";
import { SCHOOL_LEVELS } from "@/mockup/columns/sessionColumns";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { useNavigate } from "react-router-dom";
import { deleteLevel, deleteManyLevels } from "@/api/levelAPI";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import level_icon from "@/assets/images/header/level_ico.svg";
import ActionItem from "@/components/items/ActionItem";
import EditLevel from "./EditLevel";
import ViewLevel from "./ViewLevel";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import useLevel from "@/components/hooks/useLevel";
import { CloudUploadRounded } from "@mui/icons-material";
import ImportLevels from "./ImportLevels";
import { useAuth } from "@/hooks/useAuth";

const LevelTab = () => {
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const [openImportLevel, setOpenImportLevel] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAddCurrentLevel, setOpenAddCurrentLevel] = useState(false);
  //Get Session id

  const { levelLoading, levelRefetch, levelsOption } = useLevel();

  const { mutate, isPending } = useMutation({ mutationFn: deleteLevel });

  const handleDelete = (id) => {
    const values = {
      id,
      sessionId: session?.sessionId,
      termId: session?.termId,
    };
    Swal.fire({
      title: "Removing Level",
      html: ` <div style='text-align:left;display:flex;flex-direction:column;gap:8px;'>
      <p>  You are about to delete a level. This action is irreversible and will permanently remove all associated data,including:</p>
        <ul style='padding-block:8px;'>
   <li style='font-weight:bold;'>Class schedules</li>
  <li style='font-weight:bold;'>Student enrollments</li>
  <li style='font-weight:bold;'>Attendance records</li>
  <li style='font-weight:bold;'>Grades and assignments</li>
  <li style='font-weight:bold;'>Academic reports and records</li>
  </ul>
  
           <p>   Please proceed with caution. If you are certain you want to delete
              this academic year, click &apos;Confirm.&apos; Otherwise, click
              &apos;Cancel&apos; to keep the academic year intact.</p>
            <p style='color:var(--secondary);font-weight:bold;'>Are you sure you want to delete this level?</p>
          </div>`,
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        Swal.showLoading();
        mutate(values, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["levels"] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const handleSelectionChange = (rows) => {
    setSelectedLevels(rows);
  };

  const { mutate: deleteManyMutateAsync, isPending: deleteManyIsLoading } =
    useMutation({
      mutationFn: deleteManyLevels,
    });

  const handleMultipleDeleteSession = () => {
    Swal.fire({
      title: "Removing Session",
      text: "You are about to remove the selected sessions. Removing session will delete all of its related content.Changes cannot be undone. Do you want to remove?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      const levels = _.map(selectedLevels, "termId");
      if (isConfirmed) {
        deleteManyMutateAsync(levels, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["terms"] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const handleEdit = (data) => {
  
    const level = {
      _id: data?._id,
      level: data?.level?.name,
      initials: data?.level?.initials,
      type: data?.level?.type,
      teacher: data?.teacher,
    };
    schoolSessionDispatch({
      type: "editLevel",
      payload: { open: true, data: level },
    });
  };

  const handleOpenSubject = ({ _id }) => {
    navigate(`/level/${_id}/courses`);
  };

  const handleOpenLevel = ({ _id, type }) => {
    navigate(`/level/${_id}`, {
      replace: true,
      state: {
        levelId: _id,
        levelName: type,
      },
    });
  };

  const handleView = (data) => {
    schoolSessionDispatch({
      type: "viewLevel",
      payload: { open: true, data },
    });
  };

  const handleOpenImportLevel = () => setOpenImportLevel(true);
  const handleCloseImportLevel = () => setOpenImportLevel(false);

  const newLevelColumns = [
    ...SCHOOL_LEVELS,

    {
      field: null,
      title: "Class",
      width: "40%",
      render: (rowData) => (
        <Stack direction="row" spacing={5}>
          <Link
            sx={{ cursor: "pointer" }}
            onClick={() => handleOpenLevel(rowData)}
          >
            Go to Class
          </Link>
          <Link
            sx={{ cursor: "pointer" }}
            onClick={() => handleOpenSubject(rowData)}
          >
            Add Subjects
          </Link>
        </Stack>
      ),
    },
    {
      field: null,
      title: "Action",
      render: (data) => (
        <ActionItem
          // data={rowData}
          viewProps={{
            title: "View level information",
            titleAccess: "View level information",
          }}
          editProps={{
            title: "Edit level information",
            titleAccess: "Edit level information",
          }}
          deleteProps={{
            title: "Delete level information",
            titleAccess: "Delete level information",
          }}
          handleView={() => handleView(data)}
          handleEdit={() => handleEdit(data)}
          handleDelete={() => handleDelete(data?._id)}
        />
      ),
    },
  ];

  return (
    <Box pt={2}>
      <CustomizedMaterialTable
        title="Levels"
        icon={level_icon}
        search={true}
        isPending={levelLoading}
        columns={newLevelColumns}
        data={levelsOption}
        actions={[]}
        otherButtons={
          <Button
            color="success"
            variant="contained"
            startIcon={<CloudUploadRounded />}
            onClick={handleOpenImportLevel}
          >
            Import Levels
          </Button>
        }
        showAddButton={true}
        addButtonText="New Level"
        addButtonImg={EMPTY_IMAGES.level}
        addButtonMessage="😑 Oops! It seems you don't have any level at the moment.Create a new one"
        onAddButtonClicked={() => setOpenAddCurrentLevel(true)}
        handleRefresh={levelRefetch}
        onSelectionChange={handleSelectionChange}
        onDeleteClicked={handleMultipleDeleteSession}
      />
      <ViewLevel />
      <AddLevel open={openAddCurrentLevel} setOpen={setOpenAddCurrentLevel} />
      <EditLevel />
      <ImportLevels open={openImportLevel} onClose={handleCloseImportLevel} />
      {(isPending || deleteManyIsLoading) && <GlobalSpinner />}
    </Box>
  );
};

export default LevelTab;
