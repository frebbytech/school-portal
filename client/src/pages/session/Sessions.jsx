import React from "react";
import { use } from "react";
import { Container } from "@mui/material";
import Swal from "sweetalert2";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import session_icon from "@/assets/images/header/session_ico.svg";
import { SCHOOL_SESSION_COLUMN } from "@/mockup/columns/sessionColumns";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import {
  deleteTerm,
  disableSessionAccount,
  getAllTerms,
  switchTerm,
} from "@/api/termAPI";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import CustomTitle from "@/components/custom/CustomTitle";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TableSkeleton from "@/components/skeleton/TableSkeleton";

const Sessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();

  const sessions = useQuery({
    queryKey: ["terms", user?._id],
    queryFn: () => getAllTerms(),
    initialData: [],
    enabled: !!user?._id,
    // refetchOnMount: false,
  });

  ///Delete session by id
  const { mutate: deleteMutate, isPending } = useMutation({
    mutationFn: deleteTerm,
  });

  const handleDeleteSession = (id) => {
    Swal.fire({
      title: "Removing Session",
      // text: "Removing session will delete all of its related content.Do you want to remove?",
      html: `<div style='text-align:left;display:flex;flex-direction:column;gap:8px;'>
        <p>This removes the term only if it is empty: no enrolled students, scores, payments or attendance.</p>
        <p>A term that holds records cannot be removed. Archive it instead so its history is kept.</p>
        <p style='color:var(--secondary);font-weight:bold;'>Remove this academic term?</p>
      </div>`,
      showCancelButton: true,
      // background: ,
      backdrop: "rgba(0,0,0,0.2)",
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        deleteMutate(id, {
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

  // const { mutateAsync, isPending } = useMutation({
  //   mutationFn: deleteManyTerms,
  // });

  // const handleMultipleDeleteSession = () => {
  //   Swal.fire({
  //     title: "Removing Session",
  //     text: "You are about to remove the selected sessions. Removing session will delete all of its related content.Changes cannot be undone. Do you want to remove?",
  //     showCancelButton: true,
  //     backdrop: false,
  //   }).then(({ isConfirmed }) => {
  //     const sessions = _.map(selectedSessions, "termId");
  //     if (isConfirmed) {
  //       mutateAsync(sessions, {
  //         onSettled: () => {
  //           queryClient.invalidateQueries({ queryKey: ["terms"] });
  //         },
  //         onSuccess: (data) => {
  //           schoolSessionDispatch(alertSuccess(data));
  //         },
  //         onError: (error) => {
  //           schoolSessionDispatch(alertError(error));
  //         },
  //       });
  //     }
  //   });
  // };

  //Edit session
  const handleViewSession = (data) => {
    navigate(`/session/${data?.termId}`);
  };
  //Edit session
  const handlEditSession = (id) => {
    navigate(`/session/${id}/edit`);
  };

  const handleOpenSession = () => {
    navigate("/session/new");
  };

  ///Disable or Enable User Account by id
  const { mutate: enableMutate } = useMutation({
    mutationFn: disableSessionAccount,
  });
  const handleActivateSession = ({ _id, active }) => {
    Swal.fire({
      title: active
        ? "Do you want to disable this session"
        : "Do you want to enable this session",
      text: active ? "Disabling Session" : "Enabling Session",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        const info = {
          _id,
          active: active ? false : true,
        };

        enableMutate(info, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["terms"] });
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };
  ///Disable or Enable User Account by id
  const { mutate: switchMutate } = useMutation({
    mutationFn: switchTerm,
  });
  const handleSwitchSession = ({ _id, status }) => {
    Swal.fire({
      title: "Switch School Session",
      text: "Do you wish to make this session your current session?",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        const info = {
          id: _id,
          status,
        };

        switchMutate(info, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["terms"] });
            schoolSessionDispatch(
              alertSuccess(
                info?.status === "current"
                  ? "Your current session has been changed."
                  : data
              )
            );
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  if (sessions.isPending) {
    return <TableSkeleton />;
  }

  return (
    <>
      <Container>
        <CustomTitle
          title="School Session"
          subtitle="Create, update, and oversee academic sessions to ensure smooth academic operations"
          img={session_icon}
          color="primary.main"
        />

        <CustomizedMaterialTable
          title="Sessions"
          icon={session_icon}
          isPending={sessions.isPending}
          columns={SCHOOL_SESSION_COLUMN(
            handleActivateSession,
            handleViewSession,
            handlEditSession,
            handleSwitchSession
          )}
          data={sessions.data ? sessions.data : []}
          actions={[]}
          showRowShadow={false}
          handleEdit={handlEditSession}
          handleDelete={handleDeleteSession}
          addButtonImg={EMPTY_IMAGES.session}
          addButtonMessage="😑 No School Session available!.Create a new one!"
          showAddButton={true}
          addButtonText="New Session"
          onAddButtonClicked={handleOpenSession}
          handleRefresh={sessions.refetch}
          // onDeleteClicked={handleMultipleDeleteSession}
          options={{
            search: true,
          }}
        />
      </Container>

      {isPending && <GlobalSpinner />}
    </>
  );
};

export default Sessions;
