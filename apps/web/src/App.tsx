import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { alertDeliveries, demoListings, savedSearches, sourceHealth, type DemoListing, type SavedSearch } from "./data/demoData";
import { fetchWorkerListings, fetchWorkerSourceHealth, resolveWorkerApiBaseUrl } from "./lib/listingsApi";
import {
  createTenantSavedSearch,
  deleteTenantSavedSearch,
  fetchTenantSavedSearches,
  updateTenantSavedSearch
} from "./lib/savedSearchesApi";
import {
  clearSupabaseAuthSession,
  getStoredSupabaseAuthSession,
  signInWithSupabasePassword
} from "./lib/supabaseAuth";
import {
  buildDemoTenantWorkflow,
  createTenantWorkflowNote,
  demoOrgId,
  demoTenantId,
  fetchTenantWorkflow,
  resolveTenantWorkflowAccessToken,
  updateTenantWorkflowStatus,
  type TenantWorkflowItem,
  type TenantWorkflowStatus
} from "./lib/tenantWorkflowApi";
import { SpatialAppShell } from "./spatial/SpatialAppShell";

function App() {
  const [listings, setListings] = useState<DemoListing[]>(demoListings);
  const [dataMode, setDataMode] = useState<"fallback" | "live">("fallback");
  const [dataMessage, setDataMessage] = useState("Se incearca incarcarea din Worker API.");
  const [sourceHealthCards, setSourceHealthCards] = useState(sourceHealth);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [savedSearchItems, setSavedSearchItems] = useState<SavedSearch[]>(savedSearches);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savedSearchCriteria, setSavedSearchCriteria] = useState("");
  const [savedSearchFrequency, setSavedSearchFrequency] = useState<SavedSearch["frequency"]>("near real-time");
  const [savedSearchAlertChannel, setSavedSearchAlertChannel] = useState<SavedSearch["alertChannel"]>("in_app");
  const [savedSearchAlertsEnabled, setSavedSearchAlertsEnabled] = useState(true);
  const [editingSavedSearchId, setEditingSavedSearchId] = useState<string | null>(null);
  const [savedSearchMessage, setSavedSearchMessage] = useState("Saved searches demo: poti crea cautari local.");
  const [authSession, setAuthSession] = useState(getStoredSupabaseAuthSession);
  const [authEmail, setAuthEmail] = useState(() => getStoredSupabaseAuthSession()?.email ?? "");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState(() => {
    const session = getStoredSupabaseAuthSession();
    return session?.email
      ? `Autentificat ca ${session.email}.`
      : "Login Supabase: foloseste access token de utilizator pentru workflow tenant.";
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [workflowItems, setWorkflowItems] = useState<TenantWorkflowItem[]>(() =>
    buildDemoTenantWorkflow(demoListings, demoTenantId)
  );
  const [workflowMode, setWorkflowMode] = useState<"demo" | "live">("demo");
  const [workflowMessage, setWorkflowMessage] = useState("Workflow demo: se folosesc listingurile indexate local.");
  const [workflowActionMessage, setWorkflowActionMessage] = useState("");
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const workflowStatusOverrides = useRef(new Map<string, TenantWorkflowStatus>());

  const applyWorkflowOverrides = (items: TenantWorkflowItem[]) =>
    items.map((item) => {
      const status = workflowStatusOverrides.current.get(item.listingId);
      return status ? { ...item, status } : item;
    });

  const loadListings = useCallback(async (isActive: () => boolean = () => true) => {
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();

    if (!workerApiBaseUrl) {
      if (!isActive()) {
        return;
      }
      setListings(demoListings);
      setDataMode("fallback");
      setDataMessage("Fallback demo: Worker API URL nu este configurat.");
      return;
    }

    setIsLoadingListings(true);

    try {
      const apiListings = await fetchWorkerListings({ baseUrl: workerApiBaseUrl });

      if (!isActive()) {
        return;
      }

      if (apiListings.length === 0) {
        setListings(demoListings);
        setDataMode("fallback");
        setDataMessage("Fallback demo: Worker API nu a returnat listinguri.");
        return;
      }

      setListings(apiListings);
      setDataMode("live");
      setDataMessage("Live API: listinguri incarcate din Worker.");
    } catch (error: unknown) {
      if (!isActive()) {
        return;
      }
      setListings(demoListings);
      setDataMode("fallback");
      setDataMessage(`Fallback demo: ${error instanceof Error ? error.message : "Worker API indisponibil"}.`);
    } finally {
      if (isActive()) {
        setIsLoadingListings(false);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    void loadListings(() => isActive);
    return () => {
      isActive = false;
    };
  }, [loadListings]);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();

    if (!workerApiBaseUrl) {
      return undefined;
    }

    fetchWorkerSourceHealth({ baseUrl: workerApiBaseUrl })
      .then((apiSourceHealth) => {
        if (ignoreResult || apiSourceHealth.length === 0) {
          return;
        }

        setSourceHealthCards(apiSourceHealth);
      })
      .catch(() => {
        if (!ignoreResult) {
          setSourceHealthCards(sourceHealth);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();

    if (!workerApiBaseUrl || !accessToken) {
      return undefined;
    }

    fetchTenantSavedSearches({ baseUrl: workerApiBaseUrl, orgId: demoOrgId, accessToken })
      .then((apiSavedSearches) => {
        if (ignoreResult || apiSavedSearches.length === 0) {
          return;
        }

        setSavedSearchItems(apiSavedSearches);
        setSavedSearchMessage("Saved searches live: date incarcate din backend.");
      })
      .catch(() => {
        if (!ignoreResult) {
          setSavedSearchMessage("Saved searches demo: backendul nu este disponibil.");
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [authSession?.accessToken]);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    const fallbackWorkflow = buildDemoTenantWorkflow(listings, demoTenantId);

    setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));

    if (!workerApiBaseUrl) {
      setWorkflowMode("demo");
      setWorkflowMessage("Workflow demo: endpointul backend nu este configurat.");
      return undefined;
    }

    if (!accessToken) {
      setWorkflowMode("demo");
      setWorkflowMessage("Workflow demo: lipseste tokenul Supabase de utilizator pentru endpointurile tenant.");
      return undefined;
    }

    setIsLoadingWorkflow(true);
    fetchTenantWorkflow({ baseUrl: workerApiBaseUrl, orgId: demoOrgId, listings, accessToken })
      .then((apiWorkflowItems) => {
        if (ignoreResult) {
          return;
        }

        if (apiWorkflowItems.length === 0) {
          setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));
          setWorkflowMode("demo");
          setWorkflowMessage("Workflow demo: endpointul backend a raspuns fara date.");
          return;
        }

        setWorkflowItems(applyWorkflowOverrides(apiWorkflowItems));
        setWorkflowMode("live");
        setWorkflowMessage("Workflow live: statusuri per tenant incarcate din backend.");
      })
      .catch((error: unknown) => {
        if (ignoreResult) {
          return;
        }

        setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));
        setWorkflowMode("demo");
        setWorkflowMessage(
          `Workflow demo: ${error instanceof Error ? error.message : "endpoint workflow indisponibil"}.`
        );
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsLoadingWorkflow(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [authSession?.accessToken, listings]);

  const handleWorkflowStatusChange = async (listingId: string, status: TenantWorkflowStatus) => {
    const fallbackWorkflow = buildDemoTenantWorkflow(listings, demoTenantId);
    const workflowItem =
      workflowItems.find((item) => item.listingId === listingId) ??
      fallbackWorkflow.find((item) => item.listingId === listingId);
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();

    if (!workflowItem) {
      setWorkflowActionMessage("Nu exista workflow pentru listingul selectat.");
      return;
    }

    workflowStatusOverrides.current.set(listingId, status);
    setWorkflowItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.listingId === listingId ? { ...currentItem, status, updatedAt: new Date().toISOString() } : currentItem
      )
    );
    setWorkflowActionMessage("Se actualizeaza workflow-ul tenantului.");

    if (!workerApiBaseUrl) {
      setWorkflowActionMessage("Salvat local: endpointul backend pentru workflow nu este configurat.");
      return;
    }

    if (!accessToken) {
      setWorkflowActionMessage("Salvat local: lipseste tokenul Supabase de utilizator pentru workflow tenant.");
      return;
    }

    try {
      await updateTenantWorkflowStatus({
        baseUrl: workerApiBaseUrl,
        orgId: workflowItem.orgId,
        listingId,
        status,
        accessToken
      });
      setWorkflowActionMessage("Workflow salvat in backend.");
    } catch {
      setWorkflowActionMessage("Salvat local: endpointul backend pentru workflow nu este disponibil.");
    }
  };

  const resetSavedSearchForm = () => {
    setSavedSearchName("");
    setSavedSearchCriteria("");
    setSavedSearchFrequency("near real-time");
    setSavedSearchAlertChannel("in_app");
    setSavedSearchAlertsEnabled(true);
    setEditingSavedSearchId(null);
  };

  const handleWorkflowNoteCreate = async (listingId: string, body: string) => {
    const trimmedBody = body.trim();
    const workflowItem = workflowItems.find((item) => item.listingId === listingId);
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();

    if (!trimmedBody) {
      setWorkflowActionMessage("Nota nu poate fi goala.");
      return;
    }

    const localNote = {
      id: `local-note-${Date.now()}`,
      body: trimmedBody,
      authorUserId: authSession?.email ?? "local-user",
      createdAt: new Date().toISOString()
    };

    setWorkflowItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.listingId === listingId
          ? { ...currentItem, notes: [localNote, ...currentItem.notes], updatedAt: localNote.createdAt }
          : currentItem
      )
    );
    setWorkflowActionMessage("Nota salvata local.");

    if (!workflowItem || !workerApiBaseUrl || !accessToken) {
      return;
    }

    try {
      const apiNote = await createTenantWorkflowNote({
        baseUrl: workerApiBaseUrl,
        orgId: workflowItem.orgId,
        listingId,
        body: trimmedBody,
        accessToken
      });
      setWorkflowItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.listingId === listingId
            ? {
                ...currentItem,
                notes: currentItem.notes.map((note) => (note.id === localNote.id ? apiNote : note)),
                updatedAt: apiNote.createdAt
              }
            : currentItem
        )
      );
      setWorkflowActionMessage("Nota salvata in backend.");
    } catch {
      setWorkflowActionMessage("Nota salvata local; backendul nu este disponibil.");
    }
  };

  const handleSavedSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = savedSearchName.trim();
    const trimmedCriteria = savedSearchCriteria.trim();

    if (!trimmedName || !trimmedCriteria) {
      setSavedSearchMessage("Completeaza numele si criteriile cautarii.");
      return;
    }

    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();

    if (editingSavedSearchId) {
      const localUpdate = {
        id: editingSavedSearchId,
        name: trimmedName,
        criteria: trimmedCriteria,
        matches: 0,
        frequency: savedSearchFrequency,
        alertChannel: savedSearchAlertChannel,
        alertsEnabled: savedSearchAlertsEnabled
      };
      setSavedSearchItems((currentItems) =>
        currentItems.map((item) => (item.id === editingSavedSearchId ? localUpdate : item))
      );
      resetSavedSearchForm();
      setSavedSearchMessage("Cautare actualizata local.");

      if (workerApiBaseUrl && accessToken) {
        try {
          const apiSavedSearch = await updateTenantSavedSearch({
            baseUrl: workerApiBaseUrl,
            orgId: demoOrgId,
            accessToken,
            searchId: editingSavedSearchId,
            name: trimmedName,
            criteria: trimmedCriteria,
            frequency: savedSearchFrequency,
            alertChannel: savedSearchAlertChannel,
            alertsEnabled: savedSearchAlertsEnabled
          });
          setSavedSearchItems((currentItems) =>
            currentItems.map((item) => (item.id === editingSavedSearchId ? apiSavedSearch : item))
          );
          setSavedSearchMessage("Cautare actualizata in backend.");
        } catch {
          setSavedSearchMessage("Cautare actualizata local; backendul nu este disponibil.");
        }
      }
      return;
    }

    const localSavedSearch = {
      id: `local-${Date.now()}`,
      name: trimmedName,
      criteria: trimmedCriteria,
      matches: 0,
      frequency: savedSearchFrequency,
      alertChannel: savedSearchAlertChannel,
      alertsEnabled: savedSearchAlertsEnabled
    };
    setSavedSearchItems((currentItems) => [localSavedSearch, ...currentItems]);
    resetSavedSearchForm();
    setSavedSearchMessage("Cautare salvata local.");

    if (workerApiBaseUrl && accessToken) {
      try {
        const apiSavedSearch = await createTenantSavedSearch({
          baseUrl: workerApiBaseUrl,
          orgId: demoOrgId,
          accessToken,
          name: trimmedName,
          criteria: trimmedCriteria,
          frequency: savedSearchFrequency,
          alertChannel: savedSearchAlertChannel,
          alertsEnabled: savedSearchAlertsEnabled
        });
        setSavedSearchItems((currentItems) =>
          currentItems.map((item) => (item.id === localSavedSearch.id ? apiSavedSearch : item))
        );
        setSavedSearchMessage("Cautare salvata in backend.");
      } catch {
        setSavedSearchMessage("Cautare salvata local; backendul nu este disponibil.");
      }
    }
  };

  const handleSavedSearchEdit = (search: SavedSearch) => {
    setEditingSavedSearchId(search.id);
    setSavedSearchName(search.name);
    setSavedSearchCriteria(search.criteria);
    setSavedSearchFrequency(search.frequency);
    setSavedSearchAlertChannel(search.alertChannel);
    setSavedSearchAlertsEnabled(search.alertsEnabled);
    setSavedSearchMessage(`Editezi cautarea ${search.name}.`);
  };

  const handleSavedSearchDelete = async (search: SavedSearch) => {
    setSavedSearchItems((currentItems) => currentItems.filter((item) => item.id !== search.id));
    if (editingSavedSearchId === search.id) {
      resetSavedSearchForm();
    }
    setSavedSearchMessage("Cautare stearsa local.");

    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    if (!workerApiBaseUrl || !accessToken || search.id.startsWith("local-")) {
      return;
    }

    try {
      await deleteTenantSavedSearch({
        baseUrl: workerApiBaseUrl,
        orgId: demoOrgId,
        accessToken,
        searchId: search.id
      });
      setSavedSearchMessage("Cautare stearsa din backend.");
    } catch {
      setSavedSearchMessage("Cautare stearsa local; backendul nu este disponibil.");
    }
  };

  const handleSupabaseLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage("Se autentifica prin Supabase Auth.");

    try {
      const session = await signInWithSupabasePassword({
        email: authEmail.trim(),
        password: authPassword
      });
      setAuthSession(session);
      setAuthEmail(session.email ?? authEmail.trim());
      setAuthPassword("");
      setAuthMessage(`Autentificat ca ${session.email ?? authEmail.trim()}.`);
    } catch (error) {
      setAuthMessage(`Login esuat: ${error instanceof Error ? error.message : "Supabase Auth indisponibil"}.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSupabaseLogout = () => {
    clearSupabaseAuthSession();
    setAuthSession(null);
    setAuthPassword("");
    setAuthMessage("Delogat: workflow-ul ramane in demo pana la un nou login Supabase.");
  };

  return (
    <SpatialAppShell
      listings={listings}
      sourceHealth={sourceHealthCards}
      workflowItems={workflowItems}
      savedSearches={savedSearchItems}
      alertDeliveries={alertDeliveries}
      dataMode={dataMode}
      dataMessage={dataMessage}
      workflowMode={workflowMode}
      workflowMessage={workflowMessage}
      workflowActionMessage={workflowActionMessage}
      isLoadingListings={isLoadingListings}
      isLoadingWorkflow={isLoadingWorkflow}
      authSessionEmail={authSession?.email ?? undefined}
      authEmail={authEmail}
      authPassword={authPassword}
      authMessage={authMessage}
      isAuthLoading={isAuthLoading}
      savedSearchName={savedSearchName}
      savedSearchCriteria={savedSearchCriteria}
      savedSearchFrequency={savedSearchFrequency}
      savedSearchAlertChannel={savedSearchAlertChannel}
      savedSearchAlertsEnabled={savedSearchAlertsEnabled}
      savedSearchMessage={savedSearchMessage}
      editingSavedSearchId={editingSavedSearchId}
      onRefreshListings={() => void loadListings()}
      onWorkflowStatusChange={handleWorkflowStatusChange}
      onWorkflowNoteCreate={(listingId, body) => void handleWorkflowNoteCreate(listingId, body)}
      onAuthEmailChange={setAuthEmail}
      onAuthPasswordChange={setAuthPassword}
      onAuthSubmit={handleSupabaseLogin}
      onAuthLogout={handleSupabaseLogout}
      onSavedSearchNameChange={setSavedSearchName}
      onSavedSearchCriteriaChange={setSavedSearchCriteria}
      onSavedSearchFrequencyChange={setSavedSearchFrequency}
      onSavedSearchAlertChannelChange={setSavedSearchAlertChannel}
      onSavedSearchAlertsEnabledChange={setSavedSearchAlertsEnabled}
      onSavedSearchSubmit={handleSavedSearchSubmit}
      onSavedSearchEdit={handleSavedSearchEdit}
      onSavedSearchDelete={(search) => void handleSavedSearchDelete(search)}
    />
  );
}

export default App;
