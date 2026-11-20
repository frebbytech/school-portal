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
import { sanitizeHtml } from "@/lib/safeHtml";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { deleteMessage, resendMessage } from "@/api/messageAPI";
import Transition from "@/components/animations/Transition";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { DeleteForeverRounded, RefreshRounded } from "@mui/icons-material";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

// Who it went to: the person, or the group with how many phone numbers and emails it reached
export const recipientText = (recipient) => {
  if (!recipient) return "";
  const phones = recipient.phonenumber?.length || 0;
  const emails = recipient.email?.length || 0;
  if (recipient.type === "Individual") return recipient.email?.[0] || recipient.phonenumber?.[0] || "";
  const parts = [];
  if (phones) parts.push(`${phones} phone number${phones === 1 ? "" : "s"}`);
  if (emails) parts.push(`${emails} email address${emails === 1 ? "" : "es"}`);
  return `${recipient.type || "Group"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
};

function SMSView() {
  const queryClient = useQueryClient();

  const {
    schoolSessionState: {
      messageData: { open, data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const { mutate, isPending } = useMutation({ mutationFn: resendMessage });
  const sendAgain = () => {
    mutate(
      { id: data?._id },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        onSuccess: (message) => {
          schoolSessionDispatch(alertSuccess(message));
          handleClose();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };
  // A delivered message goes to everyone again (and costs again): ask first
  const onSend = () => {
    if (!data?.active) return sendAgain();
    Swal.fire({
      title: "Send this message again?",
      text: "It was already delivered. Sending it again delivers it to every recipient a second time.",
      showCancelButton: true,
      confirmButtonText: "Send again",
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) sendAgain();
    });
  };

  const { mutate: deleteMutateAsync, isPending: dLoading } = useMutation({
    mutationFn: deleteMessage,
  });
  const handleDelete = () => {
    Swal.fire({
      title: "Removing Message",
      text: "Do you want to delete this message? It is only removed from this list: anything already sent stays sent.",
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
          <Tooltip title={data?.active ? "Send again" : "Resend Message"}>
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
            secondary={recipientText(data?.recipient)}
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
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data?.body?.message) }}></div>
        </Stack>
      </DialogContent>
      {isPending && <LoadingSpinner value="Resending Message..." />}
      {dLoading && <LoadingSpinner value="Removing Message..." />}
    </Dialog>
  );
}

export default SMSView;
