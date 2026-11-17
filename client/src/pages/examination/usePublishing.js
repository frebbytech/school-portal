import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { getPublications, publishReport, publishReports } from "@/api/ExaminationAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { useRealtime } from "@/realtime/RealtimeProvider";
import { isActive, publishAlert, publishFailure, STARTED_MESSAGE } from "./publishOutcome";

// Starting a publish and following it. Sending runs in the background on the server, so
// "start" only queues it; progress and the result come over the socket (see RealtimeProvider)
// and are also read from the server, which is what the screen shows after a page reload.
//   examId  given: publish that one student's report card; otherwise the whole class
export function usePublishing({ levelId, termId, sessionId, examId }) {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const { progress } = useRealtime();

  const query = useQuery({
    queryKey: ["publications", levelId, termId],
    queryFn: () => getPublications({ levelId, termId }),
    enabled: Boolean(levelId && termId),
    // A safety net while something is running, in case a socket message is missed
    refetchInterval: (q) => (q.state.data?.some(isActive) ? 15000 : false),
  });

  // The newest publication that concerns this screen
  const relevant = (query.data || []).filter((p) => (examId ? p.scope === "class" || p.examination === examId : true));
  const latest = relevant[0];
  const live = latest ? progress[latest._id] : undefined;
  const current = latest && live ? { ...latest, ...live } : latest;

  const mutation = useMutation({
    mutationFn: ({ value, resend }) =>
      examId
        ? publishReport({ id: examId, value, resend })
        : publishReports({ sessionId, termId, levelId, value, resend }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["publications"] });

  const start = (value, { resend = false } = {}) => {
    mutation.mutate(
      { value, resend },
      {
        onSuccess: () => {
          schoolSessionDispatch(publishAlert({ severity: "info", message: STARTED_MESSAGE }));
          refresh();
        },
        onError: async (error) => {
          // Sending again is a decision: ask, then repeat the request with the confirmation
          if (error?.code === "ALREADY_PUBLISHED") {
            const { isConfirmed } = await Swal.fire({
              title: "Already sent",
              text: error.message,
              showCancelButton: true,
              confirmButtonText: "Send again",
              backdrop: false,
            });
            if (isConfirmed) start(value, { resend: true });
            return;
          }
          schoolSessionDispatch(publishAlert(publishFailure(error)));
          if (error?.code === "PUBLISH_IN_PROGRESS") refresh();
        },
      }
    );
  };

  return {
    publication: current,
    active: isActive(current),
    starting: mutation.isPending,
    start,
  };
}
