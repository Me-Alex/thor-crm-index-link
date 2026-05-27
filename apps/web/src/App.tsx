import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  alertDeliveries,
  billingPlans,
  commercialReadinessGates,
  demoListings,
  savedSearches,
  sourceHealth,
  type BillingPlan,
  type CommercialReadinessGate,
  type DemoListing,
  type SavedSearch
} from "./data/demoData";
import {
  bootstrapWorkspace,
  createBillingCheckout,
  fetchBillingPlans,
  fetchCommercialReadiness,
  submitComplianceRequest
} from "./lib/commercialApi";
import { clearStoredActiveWorkspace, getStoredActiveWorkspace, storeActiveWorkspace, type ActiveWorkspace } from "./lib/activeWorkspace";
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
import { getRuntimeConfig, productionBlockedMessage } from "./lib/runtimeConfig";
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
import { MarketRadarAppShell } from "./radar/MarketRadarAppShell";

function App() {
  const runtime = useMemo(getRuntimeConfig, []);
  const [listings, setListings] = useState<DemoListing[]>(() => (runtime.allowDemoFallback ? demoListings : []));
  const [dataMode, setDataMode] = useState<"fallback" | "live">("fallback");
  const [dataMessage, setDataMessage] = useState(
    runtime.allowDemoFallback
      ? "Se incearca incarcarea din Worker API."
      : "Production mode: dashboardul asteapta date live din Worker API."
  );
  const [sourceHealthCards, setSourceHealthCards] = useState(() => (runtime.allowDemoFallback ? sourceHealth : []));
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [savedSearchItems, setSavedSearchItems] = useState<SavedSearch[]>(() => (runtime.allowDemoFallback ? savedSearches : []));
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savedSearchCriteria, setSavedSearchCriteria] = useState("");
  const [savedSearchFrequency, setSavedSearchFrequency] = useState<SavedSearch["frequency"]>("near real-time");
  const [savedSearchAlertChannel, setSavedSearchAlertChannel] = useState<SavedSearch["alertChannel"]>("in_app");
  const [savedSearchAlertsEnabled, setSavedSearchAlertsEnabled] = useState(true);
  const [editingSavedSearchId, setEditingSavedSearchId] = useState<string | null>(null);
  const [savedSearchMessage, setSavedSearchMessage] = useState(
    runtime.allowDemoFallback
      ? "Saved searches demo: poti crea cautari local."
      : "Production mode: saved searches cer Worker API si login Supabase."
  );
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
    runtime.allowDemoFallback ? buildDemoTenantWorkflow(demoListings, demoTenantId) : []
  );
  const [workflowMode, setWorkflowMode] = useState<"demo" | "live">("demo");
  const [workflowMessage, setWorkflowMessage] = useState(
    runtime.allowDemoFallback
      ? "Workflow demo: se folosesc listingurile indexate local."
      : "Production mode: workflow-ul cere backend live si login Supabase."
  );
  const [workflowActionMessage, setWorkflowActionMessage] = useState("");
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [billingPlanItems, setBillingPlanItems] = useState<BillingPlan[]>(billingPlans);
  const [readinessGates, setReadinessGates] = useState<CommercialReadinessGate[]>(commercialReadinessGates);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(getStoredActiveWorkspace);
  const [onboardingMessage, setOnboardingMessage] = useState(
    runtime.isProduction
      ? "Production mode: onboardingul cere Worker API si login Supabase."
      : "Creeaza un workspace pilot dupa login Supabase."
  );
  const [billingMessage, setBillingMessage] = useState(
    runtime.isProduction
      ? "Production mode: planurile platite pornesc doar dupa configurarea checkoutului."
      : "Pilotul poate porni fara checkout; planurile platite cer configurare Stripe."
  );
  const [complianceEmail, setComplianceEmail] = useState("");
  const [complianceSubject, setComplianceSubject] = useState("");
  const [complianceTargetUrl, setComplianceTargetUrl] = useState("");
  const [complianceDetails, setComplianceDetails] = useState("");
  const [complianceMessage, setComplianceMessage] = useState(
    runtime.isProduction
      ? "Production mode: cererile Takedown/GDPR trebuie inregistrate in backend."
      : "Cererile de takedown/GDPR sunt inregistrate auditabil in backend."
  );
  const [isCommercialActionLoading, setIsCommercialActionLoading] = useState(false);
  const workflowStatusOverrides = useRef(new Map<string, TenantWorkflowStatus>());
  const activeOrgId = activeWorkspace?.orgId ?? demoOrgId;
  const activeWorkspaceName = activeWorkspace?.name ?? (runtime.isProduction ? "Workspace neconfigurat" : "Agentia Demo");
  const activeWorkspaceSubtitle =
    activeWorkspace?.slug ?? authSession?.email ?? (runtime.isProduction ? "Login necesar" : "Admin");

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
      setListings(runtime.allowDemoFallback ? demoListings : []);
      setDataMode("fallback");
      setDataMessage(
        runtime.allowDemoFallback
          ? "Fallback demo: Worker API URL nu este configurat."
          : productionBlockedMessage("Worker API URL nu este configurat.")
      );
      return;
    }

    setIsLoadingListings(true);

    try {
      const apiListings = await fetchWorkerListings({ baseUrl: workerApiBaseUrl });

      if (!isActive()) {
        return;
      }

      if (apiListings.length === 0) {
        setListings(runtime.allowDemoFallback ? demoListings : []);
        setDataMode("fallback");
        setDataMessage(
          runtime.allowDemoFallback
            ? "Fallback demo: Worker API nu a returnat listinguri."
            : productionBlockedMessage("Worker API nu a returnat listinguri live.")
        );
        return;
      }

      setListings(apiListings);
      setDataMode("live");
      setDataMessage("Live API: listinguri incarcate din Worker.");
    } catch (error: unknown) {
      if (!isActive()) {
        return;
      }
      setListings(runtime.allowDemoFallback ? demoListings : []);
      setDataMode("fallback");
      setDataMessage(
        runtime.allowDemoFallback
          ? `Fallback demo: ${error instanceof Error ? error.message : "Worker API indisponibil"}.`
          : productionBlockedMessage(error instanceof Error ? error.message : "Worker API indisponibil.")
      );
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
          setSourceHealthCards(runtime.allowDemoFallback ? sourceHealth : []);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    if (!workerApiBaseUrl) {
      return undefined;
    }

    Promise.all([fetchBillingPlans({ baseUrl: workerApiBaseUrl }), fetchCommercialReadiness({ baseUrl: workerApiBaseUrl })])
      .then(([apiBillingPlans, apiReadinessGates]) => {
        if (ignoreResult) return;
        if (apiBillingPlans.length > 0) setBillingPlanItems(apiBillingPlans);
        if (apiReadinessGates.length > 0) setReadinessGates(apiReadinessGates);
      })
      .catch(() => {
        if (!ignoreResult) {
          setBillingPlanItems(billingPlans);
          setReadinessGates(commercialReadinessGates);
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

    fetchTenantSavedSearches({ baseUrl: workerApiBaseUrl, orgId: activeOrgId, accessToken })
      .then((apiSavedSearches) => {
        if (ignoreResult || apiSavedSearches.length === 0) {
          return;
        }

        setSavedSearchItems(apiSavedSearches);
        setSavedSearchMessage("Saved searches live: date incarcate din backend.");
      })
      .catch(() => {
        if (!ignoreResult) {
          setSavedSearchMessage(
            runtime.allowDemoFallback
              ? "Saved searches demo: backendul nu este disponibil."
              : productionBlockedMessage("saved searches backend indisponibil.")
          );
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [activeOrgId, authSession?.accessToken]);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    const fallbackWorkflow = runtime.allowDemoFallback ? buildDemoTenantWorkflow(listings, demoTenantId) : [];

    setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));

    if (!workerApiBaseUrl) {
      setWorkflowMode("demo");
      setWorkflowMessage(
        runtime.allowDemoFallback
          ? "Workflow demo: endpointul backend nu este configurat."
          : productionBlockedMessage("endpointul backend pentru workflow nu este configurat.")
      );
      return undefined;
    }

    if (!accessToken) {
      setWorkflowMode("demo");
      setWorkflowMessage(
        runtime.allowDemoFallback
          ? "Workflow demo: lipseste tokenul Supabase de utilizator pentru endpointurile tenant."
          : productionBlockedMessage("login Supabase necesar pentru workflow tenant.")
      );
      return undefined;
    }

    setIsLoadingWorkflow(true);
    fetchTenantWorkflow({ baseUrl: workerApiBaseUrl, orgId: activeOrgId, listings, accessToken })
      .then((apiWorkflowItems) => {
        if (ignoreResult) {
          return;
        }

        if (apiWorkflowItems.length === 0) {
          setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));
          setWorkflowMode("demo");
          setWorkflowMessage(
            runtime.allowDemoFallback
              ? "Workflow demo: endpointul backend a raspuns fara date."
              : productionBlockedMessage("endpointul workflow a raspuns fara date.")
          );
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
          runtime.allowDemoFallback
            ? `Workflow demo: ${error instanceof Error ? error.message : "endpoint workflow indisponibil"}.`
            : productionBlockedMessage(error instanceof Error ? error.message : "endpoint workflow indisponibil.")
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
  }, [activeOrgId, authSession?.accessToken, listings]);

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

    if (runtime.isProduction) {
      if (!workerApiBaseUrl || !accessToken) {
        setWorkflowActionMessage(productionBlockedMessage("workflow-ul cere Worker API si login Supabase; salvarea locala este dezactivata."));
        return;
      }

      setWorkflowActionMessage("Se actualizeaza workflow-ul tenantului in backend.");
      try {
        await updateTenantWorkflowStatus({
          baseUrl: workerApiBaseUrl,
          orgId: workflowItem.orgId,
          listingId,
          status,
          accessToken
        });
        workflowStatusOverrides.current.set(listingId, status);
        setWorkflowItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.listingId === listingId ? { ...currentItem, status, updatedAt: new Date().toISOString() } : currentItem
          )
        );
        setWorkflowActionMessage("Workflow salvat in backend.");
      } catch {
        setWorkflowActionMessage(productionBlockedMessage("workflow backend indisponibil; salvarea locala este dezactivata."));
      }
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

    if (runtime.isProduction) {
      if (!workflowItem || !workerApiBaseUrl || !accessToken) {
        setWorkflowActionMessage(productionBlockedMessage("nota cere Worker API si login Supabase; salvarea locala este dezactivata."));
        return;
      }

      setWorkflowActionMessage("Se salveaza nota in backend.");
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
              ? { ...currentItem, notes: [apiNote, ...currentItem.notes], updatedAt: apiNote.createdAt }
              : currentItem
          )
        );
        setWorkflowActionMessage("Nota salvata in backend.");
      } catch {
        setWorkflowActionMessage(productionBlockedMessage("workflow notes backend indisponibil; salvarea locala este dezactivata."));
      }
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
      if (runtime.isProduction) {
        if (!workerApiBaseUrl || !accessToken) {
          setSavedSearchMessage(productionBlockedMessage("saved searches cer Worker API si login Supabase; salvarea locala este dezactivata."));
          return;
        }

        setSavedSearchMessage("Se actualizeaza cautarea in backend.");
        try {
          const apiSavedSearch = await updateTenantSavedSearch({
            baseUrl: workerApiBaseUrl,
            orgId: activeOrgId,
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
          resetSavedSearchForm();
          setSavedSearchMessage("Cautare actualizata in backend.");
        } catch {
          setSavedSearchMessage(productionBlockedMessage("saved searches backend indisponibil; salvarea locala este dezactivata."));
        }
        return;
      }

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
            orgId: activeOrgId,
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

    if (runtime.isProduction) {
      if (!workerApiBaseUrl || !accessToken) {
        setSavedSearchMessage(productionBlockedMessage("saved searches cer Worker API si login Supabase; salvarea locala este dezactivata."));
        return;
      }

      setSavedSearchMessage("Se salveaza cautarea in backend.");
      try {
        const apiSavedSearch = await createTenantSavedSearch({
          baseUrl: workerApiBaseUrl,
          orgId: activeOrgId,
          accessToken,
          name: trimmedName,
          criteria: trimmedCriteria,
          frequency: savedSearchFrequency,
          alertChannel: savedSearchAlertChannel,
          alertsEnabled: savedSearchAlertsEnabled
        });
        setSavedSearchItems((currentItems) => [apiSavedSearch, ...currentItems]);
        resetSavedSearchForm();
        setSavedSearchMessage("Cautare salvata in backend.");
      } catch {
        setSavedSearchMessage(productionBlockedMessage("saved searches backend indisponibil; salvarea locala este dezactivata."));
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
          orgId: activeOrgId,
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
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();

    if (runtime.isProduction) {
      if (!workerApiBaseUrl || !accessToken || search.id.startsWith("local-")) {
        setSavedSearchMessage(productionBlockedMessage("saved searches cer Worker API si login Supabase; stergerea locala este dezactivata."));
        return;
      }

      setSavedSearchMessage("Se sterge cautarea din backend.");
      try {
        await deleteTenantSavedSearch({
          baseUrl: workerApiBaseUrl,
          orgId: activeOrgId,
          accessToken,
          searchId: search.id
        });
        setSavedSearchItems((currentItems) => currentItems.filter((item) => item.id !== search.id));
        if (editingSavedSearchId === search.id) {
          resetSavedSearchForm();
        }
        setSavedSearchMessage("Cautare stearsa din backend.");
      } catch {
        setSavedSearchMessage(productionBlockedMessage("saved searches backend indisponibil; stergerea locala este dezactivata."));
      }
      return;
    }

    setSavedSearchItems((currentItems) => currentItems.filter((item) => item.id !== search.id));
    if (editingSavedSearchId === search.id) {
      resetSavedSearchForm();
    }
    setSavedSearchMessage("Cautare stearsa local.");

    if (!workerApiBaseUrl || !accessToken || search.id.startsWith("local-")) {
      return;
    }

    try {
      await deleteTenantSavedSearch({
        baseUrl: workerApiBaseUrl,
        orgId: activeOrgId,
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
    clearStoredActiveWorkspace();
    setAuthSession(null);
    setActiveWorkspace(null);
    setAuthPassword("");
    setAuthMessage(
      runtime.isProduction
        ? "Delogat: workflow-ul este blocat pana la un nou login Supabase."
        : "Delogat: workflow-ul ramane in demo pana la un nou login Supabase."
    );
  };

  const handleWorkspaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    const normalizedName = workspaceName.trim();
    const normalizedSlug = workspaceSlug.trim() || normalizedName.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");

    if (!normalizedName || !normalizedSlug) {
      setOnboardingMessage("Completeaza numele agentiei si slug-ul.");
      return;
    }
    if (!workerApiBaseUrl || !accessToken) {
      setOnboardingMessage(
        runtime.isProduction
          ? productionBlockedMessage("onboardingul cere Worker API si login Supabase.")
          : "Onboarding demo: lipseste Worker API URL sau login Supabase."
      );
      return;
    }

    setIsCommercialActionLoading(true);
    setOnboardingMessage("Se creeaza workspace-ul pilot.");
    try {
      const workspace = await bootstrapWorkspace({
        baseUrl: workerApiBaseUrl,
        accessToken,
        name: normalizedName,
        slug: normalizedSlug,
        billingEmail: billingEmail.trim() || authSession?.email || ""
      });
      const nextWorkspace = {
        orgId: workspace.orgId,
        name: normalizedName,
        slug: workspace.slug,
        ...(billingEmail.trim() || authSession?.email
          ? { billingEmail: billingEmail.trim() || authSession?.email || "" }
          : {})
      };
      setActiveWorkspace(nextWorkspace);
      storeActiveWorkspace(nextWorkspace);
      setWorkspaceSlug(workspace.slug);
      setOnboardingMessage(`Workspace pilot creat: ${workspace.slug}.`);
    } catch (error) {
      setOnboardingMessage(`Onboarding esuat: ${error instanceof Error ? error.message : "backend indisponibil"}.`);
    } finally {
      setIsCommercialActionLoading(false);
    }
  };

  const handlePlanSelect = async (plan: BillingPlan) => {
    if (!plan.checkoutRequired) {
      setBillingMessage("Planul Pilot este activabil prin onboarding, cu trial de 14 zile.");
      return;
    }

    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    if (!workerApiBaseUrl || !accessToken) {
      setBillingMessage(
        runtime.isProduction
          ? productionBlockedMessage("checkoutul cere Worker API si login Supabase.")
          : "Checkout demo: lipseste Worker API URL sau login Supabase."
      );
      return;
    }

    setIsCommercialActionLoading(true);
    setBillingMessage("Se creeaza sesiunea Stripe Checkout.");
    try {
      const checkoutUrl = await createBillingCheckout({
        baseUrl: workerApiBaseUrl,
        accessToken,
        orgId: activeOrgId,
        plan: plan.id === "scale" ? "scale" : "pro"
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setBillingMessage(`Checkout indisponibil: ${error instanceof Error ? error.message : "Stripe nu este configurat"}.`);
    } finally {
      setIsCommercialActionLoading(false);
    }
  };

  const handleComplianceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    if (!workerApiBaseUrl) {
      setComplianceMessage(
        runtime.isProduction
          ? productionBlockedMessage("compliance backend nu este configurat.")
          : "Compliance demo: Worker API URL nu este configurat."
      );
      return;
    }

    setIsCommercialActionLoading(true);
    setComplianceMessage("Se inregistreaza cererea.");
    try {
      await submitComplianceRequest({
        baseUrl: workerApiBaseUrl,
        requestType: "takedown",
        requesterEmail: complianceEmail,
        subject: complianceSubject,
        targetUrl: complianceTargetUrl,
        details: complianceDetails
      });
      setComplianceSubject("");
      setComplianceTargetUrl("");
      setComplianceDetails("");
      setComplianceMessage("Cerere inregistrata pentru review operational.");
    } catch (error) {
      setComplianceMessage(`Cererea nu a fost inregistrata: ${error instanceof Error ? error.message : "backend indisponibil"}.`);
    } finally {
      setIsCommercialActionLoading(false);
    }
  };

  return (
    <MarketRadarAppShell
      listings={listings}
      sourceHealth={sourceHealthCards}
      workflowItems={workflowItems}
      savedSearches={savedSearchItems}
      alertDeliveries={runtime.allowDemoFallback ? alertDeliveries : []}
      dataMode={dataMode}
      dataMessage={dataMessage}
      workflowMode={workflowMode}
      runtimeMode={runtime.mode}
      workflowMessage={workflowMessage}
      workflowActionMessage={workflowActionMessage}
      isLoadingListings={isLoadingListings}
      isLoadingWorkflow={isLoadingWorkflow}
      authSessionEmail={authSession?.email ?? undefined}
      activeWorkspaceName={activeWorkspaceName}
      activeWorkspaceSubtitle={activeWorkspaceSubtitle}
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
      billingPlans={billingPlanItems}
      readinessGates={readinessGates}
      workspaceName={workspaceName}
      workspaceSlug={workspaceSlug}
      billingEmail={billingEmail}
      onboardingMessage={onboardingMessage}
      billingMessage={billingMessage}
      complianceEmail={complianceEmail}
      complianceSubject={complianceSubject}
      complianceTargetUrl={complianceTargetUrl}
      complianceDetails={complianceDetails}
      complianceMessage={complianceMessage}
      isCommercialActionLoading={isCommercialActionLoading}
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
      onWorkspaceNameChange={setWorkspaceName}
      onWorkspaceSlugChange={setWorkspaceSlug}
      onBillingEmailChange={setBillingEmail}
      onWorkspaceSubmit={(event) => void handleWorkspaceSubmit(event)}
      onPlanSelect={(plan) => void handlePlanSelect(plan)}
      onComplianceEmailChange={setComplianceEmail}
      onComplianceSubjectChange={setComplianceSubject}
      onComplianceTargetUrlChange={setComplianceTargetUrl}
      onComplianceDetailsChange={setComplianceDetails}
      onComplianceSubmit={(event) => void handleComplianceSubmit(event)}
    />
  );
}

export default App;
