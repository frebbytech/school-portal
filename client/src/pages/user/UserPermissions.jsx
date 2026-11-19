import React, { useContext, useEffect } from "react";
import {
  Box,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
  Button,
  Alert,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import CustomTitle from "@/components/custom/CustomTitle";
import { getUser, putUser } from "@/api/userAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { USER_ROLES } from "@/mockup/columns/sessionColumns";

// ✅ Validation Schema
const schema = yup.object({
  permissions: yup
    .array()
    .of(yup.string())
    .min(1, "You must select at least one permission before saving.")
    .required("Permissions are required."),
});

function UserPermissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const user = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
    initialData: queryClient
      .getQueryData(["users"])
      ?.find((user) => user?._id === id),
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { permissions: user.data?.permissions || [] },
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    reset({
      permissions: user.data?.permissions || [],
    });
  }, [reset, user.data]);

  const selectedPermissions = watch("permissions");

  // ✅ Helper functions
  const allRoleTitles = USER_ROLES.flatMap((section) => [
    section.title,
    ...section.roles.map((r) => r.title),
  ]);

  const allRolesSelected =
    allRoleTitles.length > 0 &&
    allRoleTitles.every((role) => selectedPermissions.includes(role));

  const togglePermission = (title) => {
    const current = selectedPermissions || [];
    if (current.includes(title)) {
      setValue(
        "permissions",
        current.filter((t) => t !== title)
      );
    } else {
      setValue("permissions", [...current, title]);
    }
  };

  const toggleMainTitle = (mainTitle, roles) => {
    const current = selectedPermissions || [];
    const isEnabled = roles.every((r) => current.includes(r));
    const updated = isEnabled
      ? current.filter((p) => !roles.includes(p) && p !== mainTitle)
      : [...new Set([...current, mainTitle, ...roles])];
    setValue("permissions", updated);
  };

  const toggleSelectAll = () => {
    if (allRolesSelected) {
      setValue("permissions", []);
    } else {
      setValue("permissions", allRoleTitles);
    }
  };

  // ✅ Mutation logic
  const { mutate, isLoading } = useMutation({
    mutationFn: putUser,
  });

  const onSubmit = async (values) => {
    Swal.fire({
      title: "Update User Permissions",
      text: "Do you want to save these permission changes?",
      showCancelButton: true,
      confirmButtonText: "Yes, Save",
    }).then(async ({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(
          { _id: id, permissions: values.permissions },
          {
            onSettled: () => queryClient.invalidateQueries({ queryKey: ["user", id] }),
            onSuccess: () => {
              // if (data?.token) {
              //   updateAccessToken(data?.token);
              // }
              schoolSessionDispatch(alertSuccess("User permissions updated!"));
            },
            onError: (error) => schoolSessionDispatch(alertError(error)),
          }
        );
      }
    });
  };

  const handleCancel = () => navigate(-1);

  return (
    <Container sx={{ position: "relative", bgcolor: "#fff", py: 4 }}>
      <CustomTitle
        title="Roles & Permissions"
        subtitle="Manage how each user interacts with various school system modules."
      />

      <Divider sx={{ my: 2 }} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack direction="row" justifyContent="flex-end" py={2} spacing={2}>
          <Button onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ px: 4 }}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>

        {/* 🔴 Error message */}
        {errors.permissions && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.permissions.message}
          </Alert>
        )}

        <Box py={2} pl={{ xs: 2, md: 5 }} height="70svh" overflow="auto">
          <Stack spacing={3}>
            {/* ✅ Select All Checkbox */}
            <FormControlLabel
              label={
                <Typography variant="body1" fontWeight="bold" color="primary">
                  Select All Roles
                </Typography>
              }
              control={
                <Checkbox
                  checked={allRolesSelected}
                  onChange={toggleSelectAll}
                  indeterminate={
                    selectedPermissions.length > 0 &&
                    selectedPermissions.length < allRoleTitles.length
                  }
                />
              }
            />

            {/* ✅ Individual Role Groups */}
            {USER_ROLES.map((section, index) => {
              const sectionRoles = section.roles.map((r) => r.title);
              const allSectionRolesSelected = sectionRoles.every((r) =>
                selectedPermissions.includes(r)
              );

              return (
                <Box key={index}>
                  {/* Main Title Checkbox */}
                  <Controller
                    name="permissions"
                    control={control}
                    render={() => (
                      <FormControlLabel
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {section.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontStyle="italic"
                              sx={{ ml: 0.5 }}
                            >
                              {section.subtitle}
                            </Typography>
                            <Divider />
                          </Box>
                        }
                        control={
                          <Checkbox
                            checked={allSectionRolesSelected}
                            onChange={() =>
                              toggleMainTitle(section.title, sectionRoles)
                            }
                          />
                        }
                      />
                    )}
                  />

                  {/* Role Items */}
                  {section.roles.map((role, idx) => (
                    <Stack pl={5} key={idx}>
                      <Controller
                        name="permissions"
                        control={control}
                        render={() => (
                          <FormControlLabel
                            label={role.title}
                            control={
                              <Checkbox
                                checked={selectedPermissions.includes(
                                  role.title
                                )}
                                onChange={() => togglePermission(role.title)}
                              />
                            }
                          />
                        )}
                      />
                    </Stack>
                  ))}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </form>
    </Container>
  );
}

export default UserPermissions;

// import React, { useContext } from "react";
// import {
//   Box,
//   Checkbox,
//   Container,
//   Divider,
//   FormControlLabel,
//   Stack,
//   Typography,
//   Button,
// } from "@mui/material";
// import Swal from "sweetalert2";
// import { useNavigate, useParams } from "react-router-dom";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useForm, Controller } from "react-hook-form";
// import { yupResolver } from "@hookform/resolvers/yup";
// import * as yup from "yup";

// import CustomTitle from "@/components/custom/CustomTitle";
// import { putUser } from "@/api/userAPI";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
// import { USER_ROLES } from "@/mockup/columns/sessionColumns";

// // ✅ Validation Schema
// const schema = yup.object({
//   permissions: yup
//     .array()
//     .of(yup.string())
//     .min(1, "Select at least one permission before saving")
//     .required("Permissions are required"),
// });

// function UserPermissions() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const queryClient = useQueryClient();
//   const { schoolSessionDispatch } = useContext(SchoolSessionContext);

//   const { control, handleSubmit, watch, setValue } = useForm({
//     defaultValues: { permissions: [] },
//     resolver: yupResolver(schema),
//   });

//   const selectedPermissions = watch("permissions");

//   // ✅ Toggle a role checkbox
//   const togglePermission = (title) => {
//     const current = selectedPermissions || [];
//     if (current.includes(title)) {
//       setValue(
//         "permissions",
//         current.filter((t) => t !== title)
//       );
//     } else {
//       setValue("permissions", [...current, title]);
//     }
//   };

//   // ✅ Handle main title toggle
//   const toggleMainTitle = (mainTitle, roles) => {
//     const current = selectedPermissions || [];
//     const isEnabled = roles.every((r) => current.includes(r));

//     // Remove or add all roles under this title
//     const updated = isEnabled
//       ? current.filter((p) => !roles.includes(p) && p !== mainTitle)
//       : [...new Set([...current, mainTitle, ...roles])];

//     setValue("permissions", updated);
//   };

//   // ✅ Submit handler
//   const { mutate, isLoading } = useMutation({
//     mutationFn: putUser,
//   });

//   const onSubmit = async (values) => {
//     console.log(values);
//     Swal.fire({
//       title: "Update Employee Permissions",
//       text: "Do you want to save these permission changes?",
//       showCancelButton: true,
//       confirmButtonText: "Yes, Save",
//     }).then(async ({ isConfirmed }) => {
//       if (isConfirmed) {
//         mutate(
//           { _id: id, permissions: values.permissions },
//           {
//             onSettled: () => queryClient.invalidateQueries({ queryKey: ["employee", id] }),
//             onSuccess: (data) => schoolSessionDispatch(alertSuccess(data)),
//             onError: (error) => schoolSessionDispatch(alertError(error)),
//           }
//         );
//       }
//     });
//   };

//   const handleCancel = () => navigate(-1);

//   return (
//     <Container sx={{ position: "relative", bgcolor: "#fff", py: 4 }}>
//       <CustomTitle
//         title="Roles & Permissions"
//         subtitle="Manage how each user interacts with various school system modules."
//       />

//       <Divider sx={{ my: 2 }} />

//       <form onSubmit={handleSubmit(onSubmit)}>
//         <Stack direction="row" justifyContent="flex-end" py={2} spacing={2}>
//           <Button onClick={handleCancel} disabled={isLoading}>
//             Cancel
//           </Button>
//           <Button
//             type="submit"
//             variant="contained"
//             disabled={isLoading}
//             sx={{ px: 4 }}
//           >
//             {isLoading ? "Saving..." : "Save Changes"}
//           </Button>
//         </Stack>

//         <Box py={2} height="70svh" overflow="auto">
//           <Stack spacing={3}>
//             {USER_ROLES.map((section, index) => {
//               const sectionRoles = section.roles.map((r) => r.title);
//               const allRolesSelected = sectionRoles.every((r) =>
//                 selectedPermissions.includes(r)
//               );

//               return (
//                 <Box key={index}>
//                   {/* Main Section Checkbox */}
//                   <Controller
//                     name="permissions"
//                     control={control}
//                     render={() => (
//                       <FormControlLabel
//                         label={
//                           <Box>
//                             <Typography variant="body1" fontWeight="bold">
//                               {section.title}
//                             </Typography>
//                             <Typography
//                               variant="caption"
//                               color="text.secondary"
//                               fontStyle="italic"
//                               sx={{ ml: 0.5 }}
//                             >
//                               {section.subtitle}
//                             </Typography>
//                             <Divider />
//                           </Box>
//                         }
//                         control={
//                           <Checkbox
//                             checked={allRolesSelected}
//                             onChange={() =>
//                               toggleMainTitle(section.title, sectionRoles)
//                             }
//                           />
//                         }
//                       />
//                     )}
//                   />

//                   {/* Role Items */}
//                   {section.roles.map((role, idx) => (
//                     <Stack pl={5} key={idx}>
//                       <Controller
//                         name="permissions"
//                         control={control}
//                         render={() => (
//                           <FormControlLabel
//                             label={role.title}
//                             control={
//                               <Checkbox
//                                 checked={selectedPermissions.includes(
//                                   role.title
//                                 )}
//                                 onChange={() => togglePermission(role.title)}
//                               />
//                             }
//                           />
//                         )}
//                       />
//                     </Stack>
//                   ))}
//                 </Box>
//               );
//             })}
//           </Stack>
//         </Box>
//       </form>
//     </Container>
//   );
// }

// export default UserPermissions;

// import React from "react";
// import {
//   Box,
//   Checkbox,
//   Container,
//   Divider,
//   FormControlLabel,
//   Stack,
//   Typography,
//   Button,
// } from "@mui/material";
// import Swal from "sweetalert2";

// import { useState, useContext, useEffect } from "react";
// import { useParams, useNavigate, useSearchParams } from "react-router-dom";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import CustomTitle from "@/components/custom/CustomTitle";
// import { putUser } from "@/api/userAPI";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
// import { USER_ROLES } from "@/mockup/columns/sessionColumns";

// function UserPermissions() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const queryClient = useQueryClient();
//   const { schoolSessionDispatch } = useContext(SchoolSessionContext);
//   // const { customDispatch } = useContext();
//   const [selectedTitles, setSelectedTitles] = useState([]);
//   const [enabledMainTitles, setEnabledMainTitles] = useState({});

//   useEffect(() => {
//     const initialEnabledMainTitles = {};
//     USER_ROLES.forEach((item) => {
//       if (selectedTitles.includes(item.title)) {
//         initialEnabledMainTitles[item.title] = true;
//       }
//     });
//     setEnabledMainTitles(initialEnabledMainTitles);
//   }, [selectedTitles]);

//   const handleMainCheckboxChange = (mainTitle) => {
//     setSelectedTitles((prevSelectedTitles) => {
//       const isChecked = !enabledMainTitles[mainTitle];
//       const newSelectedTitles = isChecked
//         ? [...prevSelectedTitles, mainTitle]
//         : prevSelectedTitles.filter((t) => t !== mainTitle);

//       if (!isChecked) {
//         USER_ROLES.find((item) => item.title === mainTitle).roles.forEach(
//           (role) => {
//             newSelectedTitles.splice(newSelectedTitles.indexOf(role.title), 1);
//           }
//         );
//       }

//       return newSelectedTitles;
//     });

//     setEnabledMainTitles((prevEnabledMainTitles) => ({
//       ...prevEnabledMainTitles,
//       [mainTitle]: !prevEnabledMainTitles[mainTitle],
//     }));
//   };

//   const handleRoleCheckboxChange = (roleTitle) => {
//     setSelectedTitles((prevSelectedTitles) =>
//       prevSelectedTitles.includes(roleTitle)
//         ? prevSelectedTitles.filter((t) => t !== roleTitle)
//         : [...prevSelectedTitles, roleTitle]
//     );
//   };

//   const { mutate, isLoading } = useMutation({
//     mutationFn: putUser,
//   });
//   const handleSavePermissions = () => {
//     const values = {
//       _id: id,
//       permissions: selectedTitles,
//     };

//     Swal.fire({
//       title: "Updating Employee Permissions",
//       text: "Employee information modified.Save Changes?",
//       showCancelButton: true,
//     }).then(({ isConfirmed }) => {
//       if (isConfirmed) {
//         mutate(values, {
//           onSettled: () => {
//             queryClient.invalidateQueries({ queryKey: ["employee", id] });
//           },
//           onSuccess: (data) => {
//             schoolSessionDispatch(alertSuccess(data));
//           },
//           onError: (error) => {
//             schoolSessionDispatch(alertError(error));
//           },
//         });
//       }
//     });
//   };

//   const handleClose = () => {
//     navigate(-1);
//   };

//   return (
//     <Container sx={{ position: "relative", bgcolor: "#fff", py: 4 }}>
//       <CustomTitle
//         title="Roles & Permissions"
//         subtitle=" Overview of how employees can manage their permissions and role
//               assignments within the system."
//       />

//       <Divider />
//       <Stack
//         direction="row"
//         justifyContent="flex-end"
//         width="100%"
//         py={2}
//         spacing={2}
//       >
//         <Button onClick={handleClose}>Cancel</Button>
//         <Button
//           loading={isLoading}
//           variant="contained"
//           sx={{
//             paddingX: 4,
//           }}
//           onClick={handleSavePermissions}
//         >
//           Save Changes
//         </Button>
//       </Stack>

//       <Box py={2} pl={{ xs: 2, md: 20 }} height="70svh" overflow="auto">
//         <Stack spacing={3}>
//           {USER_ROLES.map((item, index) => (
//             <div key={index}>
//               <FormControlLabel
//                 label={
//                   <Typography variant="body1" fontWeight="bold">
//                     {item.title}
//                   </Typography>
//                 }
//                 checked={enabledMainTitles[item.title] || false}
//                 onChange={() => handleMainCheckboxChange(item.title)}
//                 control={<Checkbox name={item.title} value={item.title} />}
//               />

//               {item?.roles?.map((role, roleIndex) => (
//                 <Stack pl={5} key={roleIndex}>
//                   <label>
//                     <FormControlLabel
//                       label={role.title}
//                       checked={selectedTitles.includes(role.title)}
//                       onChange={() => handleRoleCheckboxChange(role.title)}
//                       disabled={!enabledMainTitles[item.title]}
//                       sx={{
//                         fontSize: "12px",
//                       }}
//                       control={
//                         <Checkbox name={role.title} value={role.title} />
//                       }
//                     />
//                   </label>
//                 </Stack>
//               ))}
//             </div>
//           ))}
//         </Stack>
//       </Box>
//     </Container>
//   );
// }

// export default UserPermissions;
