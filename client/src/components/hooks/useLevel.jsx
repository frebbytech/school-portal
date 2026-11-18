import { useQuery } from "@tanstack/react-query";
import { getAllLevels } from "@/api/levelAPI";
import _ from "lodash";
import { useAuth } from "@/hooks/useAuth";

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem("@school_session"));
  } catch {
    return null;
  }
};

const EMPTY_LEVELS = {
  students: [],
  subjects: 0,
  levelsOption: [],
  fees: [],
  levelSummary: {
    noOfLevels: 0,
    noOfSubjects: 0,
    noOfAssignedTeachers: 0,
  },
};

function useLevel() {
  const { user } = useAuth();
  const session = readSession();

  const {
    isLoading,
    isFetching,
    refetch,
    error,
    data,
  } = useQuery({
    queryKey: ["levels", session?.sessionId, session?.termId, user?._id],
    queryFn: () => getAllLevels(session?.sessionId, session?.termId),
    enabled: !!session?.sessionId && !!session?.termId && !!user?._id,
    // Shown while loading (or if loading fails) so screens always get the same shape. Not
    // `initialData`: that made the query look finished at once, so a screen showed "no
    // students" while it was still loading, and a failure looked the same.
    placeholderData: EMPTY_LEVELS,
  });

  // After a failed load the query has no data (the placeholder only covers loading)
  const levels = data ?? EMPTY_LEVELS;

  sessionStorage.setItem(
    "levels",
    JSON.stringify(
      _.map(levels.levelsOption, (level) => {
        return { _id: level?._id, type: level?.type || "" };
      })
    )
  );

  return {
    // True only while the first load is actually under way (not when there is no session yet)
    levelLoading: isLoading,
    levelIsFetching: isFetching,
    levelRefetch: refetch,
    levelError: error,
    ...levels,
  };
}

export default useLevel;
