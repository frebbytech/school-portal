import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "@/api/userAPI";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { USERS_COLUMNS } from "@/mockup/columns/sessionColumns";
import users_icon from "@/assets/images/header/users_ico.svg";
import { EMPTY_IMAGES } from "@/config/images";
import { useNavigate } from "react-router-dom";
import QueryError from "@/components/QueryError";
function UserTab() {
  const navigate = useNavigate();

  const users = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
    // initialData: [],
    refetchOnMount: false,
  });

  const handleAddNewUser = () => {
    navigate("/users/new");
  };

  const handleViewUser = (rowData) => {
    navigate(`/users/${rowData?._id}`);
  };

  return (
    <>
    {users.isError && (
      <QueryError what="the users" error={users.error} onRetry={() => users.refetch()} />
    )}
    <CustomizedMaterialTable
      isPending={users.isPending}
      title="Users"
      icon={users_icon}
      search={true}
      columns={USERS_COLUMNS}
      data={users.data ?? []}
      actions={[]}
      showAddButton={true}
      addButtonText="New User"
      addButtonImg={EMPTY_IMAGES.sms}
      addButtonMessage="No Users available !"
      onAddButtonClicked={handleAddNewUser}
      onRowClick={handleViewUser}
      showRowShadow={true}
      handleRefresh={users?.refetch}
    />
    </>
  );
}

export default UserTab;
