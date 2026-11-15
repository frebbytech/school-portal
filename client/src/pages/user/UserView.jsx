import {
  Edit,
  MessageRounded,
  PasswordRounded,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";

import Swal from "sweetalert2";
import React, { useContext, useEffect, useState } from "react";
import ProfileItem from "@/components/typo/ProfileItem";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteUser, enableOrDisableAccount, getUser } from "@/api/userAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import dayjs from "@/lib/dates";
import UserUpdatePassword from "./UserUpdatePassword";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import { Link, useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const UserView = () => {
  const queryClient = useQueryClient();

  const { id } = useParams();
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [openUpdatePassword, setOpenUpdatePassword] = useState(null);

  const {
    // schoolSessionState: { userViewData },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const user = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
    initialData: queryClient
      .getQueryData(["users"])
      ?.find((user) => user?._id === id),
  });

  useEffect(() => {
    setProfileImage(user?.data?.profile);
  }, [user?.data]);

  const handleEditUser = () => {
    navigate(`/users/${id}/edit`);
  };

  //DISABLE User Account

  const { mutateAsync, isPending } = useMutation({
    mutationFn: enableOrDisableAccount,
  });

  const disableUserAccount = () => {
    Swal.fire({
      title: user?.data?.active
        ? "Do you want to disable this account?"
        : "Do you want to enable this account?",
      text: user?.data?.active ? "Disabling Account" : "Enabling Account",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        const info = {
          id: user?.data?._id,
          active: user?.data?.active ? 0 : 1,
        };

        mutateAsync(info, {
          onSuccess: (data) => {
            queryClient.invalidateQueries(["users"]);
            queryClient.invalidateQueries(["user", id]);
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  //DELETE User Info

  const { mutateAsync: deleteMutate, isPending: deleteIsLoading } = useMutation(
    {
      mutationFn: deleteUser,
    }
  );

  const handleDelete = () => {
    Swal.fire({
      title: "Deleting User",
      text: "Do you want to delete?",
      showCancelButton: true,
    }).then((data) => {
      if (data.isConfirmed) {
        deleteMutate(user?.data?._id, {
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            navigate(`/users`);
            queryClient.invalidateQueries(["users"]);
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  //UPDATE User Password
  const handleOpenUpdatePassword = () => {
    setOpenUpdatePassword(true);
  };

  //OPEN Quick Message
  //CLOSE
  const openQuickMessage = () => {
    schoolSessionDispatch({
      type: "sendQuickMessage",
      payload: {
        open: true,
        data: {
          email: user?.data?.email,
          phonenumber: user?.data?.phonenumber,
        },
      },
    });
  };

  return (
    <>
      <>
        <Back color="#012e54" to={"/users"} />
        <CustomTitle
          title="User Information"
          subtitle="Track,manage and control courses assigned to you"
          color="primary.main"
        />

        <Box sx={{ bgcolor: "white", borderRadius: "12px", p: 2 }}>
          <Stack width="100%" justifyContent="flex-end" alignItems="flex-end">
            <ButtonGroup>
              <Tooltip title="Refresh User Profile Information">
                <IconButton onClick={user.refetch}>
                  <RefreshRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit User Profile">
                <IconButton onClick={handleEditUser}>
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Update user Password">
                <IconButton onClick={handleOpenUpdatePassword}>
                  <PasswordRounded />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Stack>
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            width="100%"
            paddingY={2}
            gap={4}
          >
            <Box
              sx={{
                p: 1,
                border: "1px solid lightgray",
                borderRadius: "50%",
              }}
            >
              <Avatar srcSet={profileImage} sx={{ width: 100, height: 100 }} />
            </Box>
            <Tooltip title="Send Message to User">
              <Button startIcon={<MessageRounded />} onClick={openQuickMessage}>
                Send Message
              </Button>
            </Tooltip>
          </Box>

          <Divider flexItem>
            <Chip label="Personal Information" color="primary" />
          </Divider>

          <ProfileItem label="Name" text={`${user?.data?.fullname}`} />
          <ProfileItem label="Username" text={`${user?.data?.username}`} />
          <ProfileItem label="Role" text={user?.data?.role} />
          <ProfileItem
            label="Date Of Birth"
            tex
            text={dayjs(new Date(user?.data?.dateofbirth)).format(
              "Do MMMM, YYYY."
            )}
          />
          <ProfileItem label="Gender" text={user?.data?.gender} />
          <ProfileItem label="Email Address" text={user?.data?.email} />
          <ProfileItem label="Telephone No." text={user?.data?.phonenumber} />
          <ProfileItem label="Address" text={user?.data?.address} />
          <ProfileItem label="Residence" text={user?.data?.residence} />

          <ProfileItem label="Nationality" text={user?.data?.nationality} />
          <Divider flexItem>
            <Chip label="Account Status" color="primary" />
          </Divider>

          <ProfileItem
            label="Account"
            text={user?.data?.active ? "Active" : "Disabled"}
            valueStyle={{
              color: user?.data?.active ? "green" : "red",
            }}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            // flexWrap="wrap"
            justifyContent={{ xs: "flex-start", sm: "flex-end" }}
            py={2}
          >
            <Tooltip title="Manage User Roles & Permissions">
              <Button>
                <Link to={`/users/${id}/permissions`}>Manage Permissions</Link>
              </Button>
            </Tooltip>
            <Tooltip
              title={user?.data?.active ? "Disable Account" : "Enable Account"}
            >
              <Button
                color={user?.data?.active ? "primary" : "warning"}
                onClick={disableUserAccount}
              >
                {user?.data?.active ? "Disable Account" : "Enable Account"}
              </Button>
            </Tooltip>
            <Tooltip title="Remove User Account">
              <Button color="error" onClick={handleDelete}>
                Delete Account
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </>
      <UserUpdatePassword
        open={openUpdatePassword}
        setOpen={setOpenUpdatePassword}
      />
      {deleteIsLoading && <LoadingSpinner value="Removing user details" />}
      {isPending && (
        <LoadingSpinner
          value={
            user?.data?.active
              ? "Disabling Account.Please Wait.."
              : "Enabling Account.Please Wait.."
          }
        />
      )}
    </>
  );
};

UserView.propTypes = {};

export default React.memo(UserView);
