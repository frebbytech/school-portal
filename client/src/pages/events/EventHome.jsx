import React, { useContext, useState } from "react";
import { Container } from "@mui/material";
import _ from "lodash";
import Swal from "sweetalert2";
import { EMPTY_IMAGES } from "../../config/images";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { deleteEvents, getAllEvents } from "@/api/eventAPI";
import CustomTitle from "@/components/custom/CustomTitle";
import EventSkeleton from "@/components/skeleton/EventSkeleton";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EVENTS } from "@/mockup/columns/sessionColumns";
import { useAuth } from "@/hooks/useAuth";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

function EventHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEvents, setSelectedEvents] = useState([]);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ["events", user?._id],
    queryFn: getAllEvents,
    initialData: [],
    enabled: !!user?._id,
  });

  const handleViewEvent = (id) => {
    navigate(`/events/${id}?redirect_to=/events`, {
      state: {
        prevPath: "/events",
      },
    });
  };
  const handleEditEvent = (id) => {
    navigate(`/events/${id}/edit`);
  };

  const handleSelectionChange = (rows) => {
    setSelectedEvents(rows);
  };

  const handleDeleteEvent = (id) => {
    setSelectedEvents([{ _id: id }]);
    handleDeleteEvents();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: deleteEvents,
  });

  const handleDeleteEvents = () => {
    Swal.fire({
      title: "Removing Events",
      text: `You are about to remove the selected events.Changes cannot be undone.`,
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      const events = _.map(selectedEvents, "_id");

      if (isConfirmed) {
        mutate(
          { events },
          {
            onSettled: () => {
              queryClient.invalidateQueries({ queryKey: ["events"] });
            },
            onSuccess: (data) => {
              schoolSessionDispatch(alertSuccess(data));
            },
            onError: (error) => {
              schoolSessionDispatch(alertError(error));
            },
          }
        );
      }
    });
  };

  if (events.isPending) {
    return <EventSkeleton />;
  }

  return (
    <Container>
      <CustomTitle
        title="Events"
        subtitle="Schedule and manage school events to ensure everyone stays informed and engaged."
        color="text.main"
        backColor="#012e54"
      />

      <CustomizedMaterialTable
        isPending={events.isPending || isPending}
        columns={EVENTS(handleViewEvent, handleEditEvent, handleDeleteEvent)}
        data={events.data}
        handleRefresh={events.refetch}
        actions={[]}
        showAddButton={true}
        addButtonImg={EMPTY_IMAGES.sms}
        addButtonText="New Event"
        addButtonMessage="😑 Send your first Event with just a button click !!!!"
        onAddButtonClicked={() => navigate("new")}
        options={{
          search: true,
          rowStyle: {
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
            background: "transparent",
            backgroundColor: "whitesmoke",
          },
        }}
        style={{
          backgroundColor: "whitesmoke",
          boxShadow: "none",
        }}
        onSelectionChange={handleSelectionChange}
        onDeleteClicked={handleDeleteEvents}
      />
    </Container>
  );
}

export default EventHome;
