import { useContext, useState } from "react";
import { Container } from "@mui/material";
import _ from "lodash";
import Swal from "sweetalert2";
import CustomTitle from "../../components/custom/CustomTitle";
import {
  deleteNotifications,
  getAllNotifications,
} from "../../api/notificationAPI";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomizedMaterialTable from "../../components/tables/CustomizedMaterialTable";
import { NOTIFICATIONS } from "../../mockup/columns/sessionColumns";
import { SchoolSessionContext } from "../../context/providers/SchoolSessionProvider";
import {
  alertError,
  alertSuccess,
} from "../../context/actions/globalAlertActions";
import { useAuth } from "@/hooks/useAuth";

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications", user?._id],
    queryFn: () => getAllNotifications(),
    initialData: [],
    enabled: false,
  });

  const handleViewNotification = (id) => {
    navigate(`/notifications/${id}`);
  };
  const handleEditNotification = (id) => {
    navigate(`/notifications/${id}/edit`);
  };

  const handleSelectionChange = (rows) => {
    setSelectedNotifications(rows);
  };

  const handleDeleteNotification = (id) => {
    setSelectedNotifications([{ _id: id }]);
    handleDeleteNotifications();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: deleteNotifications,
  });

  const handleDeleteNotifications = () => {
    Swal.fire({
      title: "Removing Notifications",
      text: `You are about to remove the selected notifications.Changes cannot be undone.`,
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      const notifications = _.map(selectedNotifications, "_id");

      if (isConfirmed) {
        mutate(
          { notifications },
          {
            onSettled: () => {
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

  return (
    <Container>
      <CustomTitle
        title="Notifications"
        subtitle="Receive notifications and track activities to stay updated on important school events and tasks."
        color="text.main"
        backColor="#012e54"
      />

      <CustomizedMaterialTable
        isPending={notifications.isPending || isPending}
        columns={NOTIFICATIONS(
          handleViewNotification,
          handleEditNotification,
          handleDeleteNotification
        )}
        data={notifications.data}
        handleRefresh={notifications.refetch}
        actions={[]}
        options={{
          search: true,
          // exportButton: false,
          // columnsButton: false,
        }}
        // onRowClick={handleViewNotification}
        onSelectionChange={handleSelectionChange}
        onDeleteClicked={handleDeleteNotifications}
      />
    </Container>
  );
}

export default Notifications;
