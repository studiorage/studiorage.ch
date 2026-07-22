(function initAiDiagram() {
    const shell = document.getElementById("ai-system");
    if (!shell) return;
    const isFrench = document.documentElement.lang.toLowerCase().startsWith("fr");
    const tabs = [...shell.querySelectorAll(".workflow-tab")];
    const details = [...shell.querySelectorAll("[data-step-detail]")];
    const explanation = shell.querySelector(".workflow-explanation");
    const workflows = isFrench ? {
        marketing: { steps: {
            objective: "Définir l'objectif de campagne, le public et le résultat attendu.",
            configuration: "Définir les budgets, canaux, limites, données autorisées et règles de décision.",
            tools: "Les outils locaux et sur mesure comparent les signaux de campagne et préparent des recommandations.",
            automation: "Le workflow surveille les performances, organise les données et planifie les tâches opérationnelles autorisées.",
            review: "Une personne vérifie chaque recommandation et décide des changements autorisés.",
            result: "Les modifications validées sont appliquées et enregistrées pour être mesurées."
        }, text: "Exemple : les données marketing sont surveillées et organisées automatiquement, mais les objectifs, limites, recommandations et actions finales restent sous contrôle humain." },
        prospecting: { steps: {
            objective: "Définir le prospect idéal, le marché, le territoire et les critères de qualification.",
            configuration: "Choisir les sources autorisées, les champs requis, les exclusions et les règles de notation.",
            tools: "Les outils sur mesure recherchent, structurent, comparent et qualifient les informations professionnelles pertinentes.",
            automation: "Le workflow construit et actualise une liste de prospects sans contacter automatiquement qui que ce soit.",
            review: "Une personne vérifie la pertinence, retire les entrées inadaptées et valide la liste.",
            result: "Seuls les prospects vérifiés sont transférés vers le CRM ou le plan de prospection choisi."
        }, text: "Exemple : la recherche et la qualification sont accélérées, tandis que la définition de la cible, la vérification et la décision de contact restent humaines." },
        planning: { steps: {
            objective: "Définir les priorités, les échéances, les ressources disponibles et le résultat souhaité.",
            configuration: "Définir les dépendances, horaires de travail, contraintes et points de validation.",
            tools: "Les outils locaux et sur mesure comparent la charge, les délais et les informations du projet.",
            automation: "Le workflow prépare des plannings, rappels et propositions de mise à jour.",
            review: "Une personne résout les conflits, ajuste les priorités et valide le planning.",
            result: "Le calendrier validé est synchronisé avec les outils de planification concernés."
        }, text: "Exemple : les propositions et mises à jour de planning sont automatisées, mais les priorités, compromis et décisions finales restent sous contrôle humain." },
        sales: { steps: {
            objective: "Définir l'étape commerciale, la relance nécessaire et la prochaine action attendue.",
            configuration: "Définir les règles CRM, seuils de qualification, rappels et limites d'escalade.",
            tools: "Les outils sur mesure organisent l'historique, identifient les informations manquantes et signalent les prochaines étapes.",
            automation: "Le workflow met à jour les fiches, prépare les rappels et classe les opportunités au bon stade.",
            review: "Une personne valide les changements sensibles et décide de la progression de chaque opportunité.",
            result: "Les mises à jour, tâches et actions commerciales validées sont enregistrées dans le CRM."
        }, text: "Exemple : l'administration commerciale et la préparation des relances sont simplifiées, tandis que la relation, la négociation et la validation restent humaines." }
    } : {
        marketing: { steps: { objective: "Define the campaign goal, audience and expected result.", configuration: "Set budgets, channels, limits, approved data and decision rules.", tools: "Local and custom tools compare campaign signals and prepare recommendations.", automation: "The workflow monitors performance, organizes data and schedules approved operational tasks.", review: "A human checks every recommendation and decides what may change.", result: "Approved campaign updates are applied and recorded for measurement." }, text: "Example: marketing data is monitored and organized automatically, but campaign objectives, limits, recommendations and final actions remain under human control." },
        prospecting: { steps: { objective: "Define the ideal prospect, market, territory and qualification criteria.", configuration: "Choose approved sources, required fields, exclusions and scoring rules.", tools: "Custom tools find, structure, compare and qualify relevant business information.", automation: "The workflow builds and updates a prospect list without contacting anyone automatically.", review: "A human verifies relevance, removes unsuitable entries and approves the list.", result: "Only verified prospects are transferred to the chosen CRM or outreach plan." }, text: "Example: prospect research and qualification are accelerated, while the target definition, verification and decision to contact remain human responsibilities." },
        planning: { steps: { objective: "Define priorities, deadlines, available resources and the desired outcome.", configuration: "Set dependencies, working hours, constraints and approval checkpoints.", tools: "Local and custom tools compare workload, timing and project information.", automation: "The workflow prepares schedules, reminders and updated planning proposals.", review: "A human resolves conflicts, adjusts priorities and approves the plan.", result: "The approved schedule is synchronized with the relevant planning tools." }, text: "Example: planning proposals and updates are automated, but priorities, compromises and final scheduling decisions stay under human control." },
        sales: { steps: { objective: "Define the sales stage, required follow-up and expected next action.", configuration: "Set CRM rules, qualification thresholds, reminders and escalation limits.", tools: "Custom tools organize lead history, identify missing information and flag next steps.", automation: "The workflow updates records, prepares reminders and routes opportunities to the right stage.", review: "A human validates sensitive changes and decides how each opportunity should progress.", result: "Approved updates, tasks and sales actions are recorded in the CRM." }, text: "Example: sales administration and follow-up preparation are streamlined, while relationship management, negotiation and approval remain human-led." }
    };
    function select(name) {
        const workflow = workflows[name]; if (!workflow) return;
        tabs.forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.workflow === name)));
        details.forEach(detail => detail.textContent = workflow.steps[detail.dataset.stepDetail] || "");
        explanation.textContent = workflow.text;
    }
    tabs.forEach((tab,index) => {
        tab.addEventListener("click", () => select(tab.dataset.workflow));
        tab.addEventListener("keydown", event => {
            if (!["ArrowLeft","ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const next = tabs[(index + direction + tabs.length) % tabs.length];
            next.focus(); select(next.dataset.workflow);
        });
    });
    select("marketing");
})();
