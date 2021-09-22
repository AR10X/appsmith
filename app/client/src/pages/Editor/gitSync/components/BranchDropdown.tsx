import React, { useEffect, useState } from "react";
import Dropdown, { DropdownOption } from "components/ads/Dropdown";
import { IconName } from "components/ads/Icon";
import CreateNewBranchForm from "./CreateNewBranchForm";
import {
  createNewBranchInit,
  fetchBranchesInit,
  switchGitBranchInit,
} from "actions/gitSyncActions";
import { useDispatch, useSelector } from "react-redux";
import {
  getGitBranches,
  getFetchingBranches,
} from "selectors/gitSyncSelectors";

const useBranches = () => {
  const branches = useSelector(getGitBranches);
  const fetchingBranches = useSelector(getFetchingBranches);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchBranchesInit());
  }, []);

  return {
    branches: [
      {
        label: "Create New",
        value: "Create New",
        icon: "plus" as IconName,
        data: { isCreateNewOption: true },
      },
      branches.map((branch: string) => ({
        label: branch,
        value: branch,
      })),
    ],
    fetchingBranches,
  };
};

export default function BranchDropdown(props: {
  setShowCreateNewBranchForm?: (flag: boolean) => void;
}) {
  const [showCreateBranchForm, setShowCreateNewBranchFormInState] = useState(
    false,
  );
  const setShowCreateNewBranchForm = (flag: boolean) => {
    setShowCreateNewBranchFormInState(flag);
    if (typeof props.setShowCreateNewBranchForm === "function") {
      props.setShowCreateNewBranchForm(flag);
    }
  };

  // todo
  // use loading state
  // add dep to refetch branches when opened
  // eslint-disable-next-line
  const { branches, fetchingBranches } = useBranches();

  const dispatch = useDispatch();

  const handleSelect = (
    value: DropdownOption["value"],
    option: DropdownOption,
  ) => {
    let updatedShowCreateBranchForm = false;
    if (option.data?.isCreateNewOption) {
      updatedShowCreateBranchForm = true;
    }
    setShowCreateNewBranchForm(updatedShowCreateBranchForm);

    if (!option.data?.isCreateNewOption) {
      if (value) dispatch(switchGitBranchInit(value));
    }
  };

  // todo set loading flag here
  const handleCreateNewBranch = (branchName: string) => {
    dispatch(
      createNewBranchInit({
        branchName,
        onErrorCallback: () => setShowCreateNewBranchForm(false),
        onSuccessCallback: () => setShowCreateNewBranchForm(false),
      }),
    );
  };

  return showCreateBranchForm ? (
    <CreateNewBranchForm
      onCancel={() => setShowCreateNewBranchForm(false)}
      onSubmit={handleCreateNewBranch}
    />
  ) : (
    <Dropdown
      dontUsePortal
      fillOptions
      onSelect={handleSelect}
      options={branches as DropdownOption[]}
      selected={{ label: "master", value: "master" }} // todo use current branch here
      showLabelOnly
    />
  );
}
