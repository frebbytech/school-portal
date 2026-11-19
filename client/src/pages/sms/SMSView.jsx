import { useContext } from "react";
import {
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  ListItemText,
  Stack,
  Tooltip,
} from "@mui/material";
import Swal from "sweetalert2";
import dayjs from "@/lib/dates";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { deleteMessage, resendMessage } from "@/api/messageAPI";
import Transition from "@/components/animations/Transition";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { DeleteForeverRounded, RefreshRounded } from "@mui/icons-material";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

function SMSView() {
  const queryClient = useQueryClient();

  const {
    schoolSessionState: {
      messageData: { open, data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const { mutate, isPending } = useMutation({ mutationFn: resendMessage });
  const onSend = () => {
    const message = {
      id: data?._id,
      type: data?.type,
      body: data?.body,
      recipient: data?.recipient,
    };

    mutate(message, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const { mutate: deleteMutateAsync, isPending: dLoading } = useMutation({
    mutationFn: deleteMessage,
  });
  const handleDelete = () => {
    Swal.fire({
      title: "Removing Message",
      text: "Do you want to delete message?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        deleteMutateAsync(data?._id, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            handleClose();
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const handleClose = () => {
    schoolSessionDispatch({
      type: "viewMessage",
      payload: {
        data: {},
        open: false,
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
    >
      <CustomDialogTitle title="Messages" onClose={handleClose} />

      <DialogContent sx={{ p: 1.5 }}>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="flex-end"
          spacing={1}
          py={1}
        >
          <Tooltip title="Resend Message">
            <IconButton onClick={onSend}>
              <RefreshRounded />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton onClick={handleDelete}>
              <DeleteForeverRounded />
            </IconButton>
            {/* <Button color="error" loading={dLoading} onClick={handleDelete}>
              Remove
            </Button> */}
          </Tooltip>
          {/* {!data.active && ( */}
          {/* // )} */}
        </Stack>
        <Chip
          label={data?.active ? "Delivered" : "Not Delivered"}
          color={data?.active ? "success" : "error"}
          sx={{ color: "#fff" }}
          size="small"
        />
        <Stack>
          <ListItemText
            primary="Date of Issue"
            secondary={dayjs(new Date(data?.createdAt)).format("Do MMMM YYYY")}
            slotProps={{
              primary: {
                color: "primary",
                fontWeight: "bold",
              },
            }}
          />
          <ListItemText
            primary="Type"
            secondary={data?.type}
            slotProps={{
              primary: {
                color: "primary",
                fontWeight: "bold",
              },
            }}
          />
          <ListItemText
            primary="Receipient"
            secondary={
              data?.recipient?.type === "Individual"
                ? data?.recipient?.email[0] || data?.recipient?.phonenumber[0]
                : data?.recipient?.type
            }
            slotProps={{
              primary: {
                color: "primary",
                fontWeight: "bold",
              },
            }}
          />

          <ListItemText
            primary={data?.body?.title}
            slotProps={{
              primary: {
                color: "primary",
                fontWeight: "bold",
              },
            }}
          />
          <div dangerouslySetInnerHTML={{ __html: data?.body?.message }}></div>
        </Stack>
      </DialogContent>
      {isPending && <LoadingSpinner value="Resending Message..." />}
      {dLoading && <LoadingSpinner value="Resending Message..." />}
    </Dialog>
  );
}

export default SMSView;
