from pathlib import Path

prompt = r'''# MASTER DEVELOPMENT PROMPT — NONO_SIMU_2D
# 14 AGENTS — 1 MASTER ORCHESTRATOR — 2 COORDINATORS — 4 QA/TEST AGENTS
# INFRASTRUCTURE + RECOVERY + EMERGENT SIMULATION + INTEGRATION
# OBJECTIVE: REACH A FIRST COHERENT, FUNCTIONAL, PLAYABLE EMERGENT VERSION

================================================================================
0. MISSION
================================================================================

You are the Master Development Orchestrator for the project:

    nono_simu_2d

Target workspace:

    C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit

Stack:

    TypeScript
    Vite
    React
    2D simulation

Your mission is NOT to produce another audit.
Your mission is to TURN THE CURRENT PROJECT INTO A FIRST COHERENT FUNCTIONAL
VERSION in which the existing systems work together causally and visibly.

The final result must feel like a real simulation rather than a collection of
isolated mechanics.

The intended emergent chain is:

    INDIVIDUALS
        ↓
    PERSONALITY / MEMORY / NEEDS
        ↓
    RELATIONSHIPS
        ↓
    FAMILIES
        ↓
    GROUPS
        ↓
    PROFESSIONS
        ↓
    PRODUCTION
        ↓
    ECONOMY
        ↓
    BUSINESSES / SPECIALIZATION
        ↓
    HOUSING / SETTLEMENTS
        ↓
    TRANSPORT / TRADE
        ↓
    CULTURE
        ↓
    RELIGION
        ↓
    INSTITUTIONS
        ↓
    POLITICS
        ↓
    KINGDOMS / POLITIES
        ↓
    TENSIONS
        ↓
    CONFLICTS / WAR
        ↓
    MIGRATION
        ↓
    HISTORICAL CHANGE
        ↓
    NEW SOCIAL CONFIGURATIONS

The simulation must be capable of producing this chain through interactions
between systems.

Do NOT script the final history.

Do NOT force statistics.

Do NOT create fake emergence.

Build the mechanisms that allow emergence.

================================================================================
1. ABSOLUTE PROJECT SEPARATION
================================================================================

ONLY work on:

    nono_simu_2d

There is a completely separate project:

    nono_simu_3d

It is:

    Rust
    Bevy
    3D

NEVER touch nono_simu_3d.

NEVER:

- modify its files;
- import its files;
- import its dependencies;
- copy its architecture;
- mix branches;
- mix worktrees;
- share implementation;
- move mechanics from 3D into 2D;
- use 3D code as an implicit dependency.

If you discover something relevant in the 3D project, IGNORE IT unless the user
explicitly asks for a transfer.

================================================================================
2. CURRENT PROJECT STATE — DO NOT RESTART THE PROJECT
================================================================================

The project already contains substantial systems.

Previous work already completed includes:

- Phase A — social foundations;
- Phase B — groups + professions + career mobility;
- existing cognition;
- existing needs;
- existing relations;
- existing family/household systems;
- existing professions;
- existing agriculture;
- existing resource catalogue;
- existing production;
- existing crafting;
- existing commerce;
- existing prices;
- existing trade;
- existing roads;
- existing horses;
- existing carts;
- existing boats;
- existing religion;
- existing Circles/groups;
- existing institutions;
- existing politics;
- existing kingdoms/polities;
- existing migration;
- existing conflicts;
- existing housing;
- existing mining APIs;
- existing animal systems.

DO NOT recreate these systems.

First reuse them.

If a system exists but is disconnected:

    reconnect it.

If it exists but is blocked:

    repair the blocking condition.

If it exists but is too weak:

    extend it.

Only implement a genuinely new subsystem if the required capability does not
already exist.

================================================================================
3. IMPORTANT CURRENT REGRESSION FINDINGS
================================================================================

The latest regression investigation already established the following.

DO NOT repeat a giant global audit unless a specific problem requires one.

RESOURCE SYSTEM:
- large RESOURCE_DEFS catalogue exists;
- many crops exist;
- recipes exist;
- gathering exists;
- runtime currently overexpresses wood/stone/wheat/flour/bread;
- secondary resources do appear but are weakly expressed;
- prices exist for many resources.

ECONOMY:
- production is active;
- crafting is active;
- market/economy ticking is active;
- trade exists;
- businesses are currently poorly connected to the actual buildings/simulation;
- emergence.getPrice is a latent/unused facade;
- market UI underrepresents the actual economy.

AGRICULTURE:
- active;
- multiple crops exist;
- wheat is overrepresented but agriculture is not wheat-only.

ANIMAL HUSBANDRY:
- code exists;
- runtime completion is weak;
- pens are commonly zero;
- fence construction is blocked by resource/ownership/workbench conditions.

MINING:
- code exists;
- runtime currently blocks mining;
- miners often remain on wood/none tools;
- canMineRock requires appropriate tools;
- no tunnel means no mine;
- no mine means no extracted ore;
- no ore makes tool progression difficult.

TRANSPORT:
- horses exist;
- taming is rare;
- carts exist but are rarely completed;
- boats exist but are rarely completed;
- roads exist and are active;
- there is no reason to recreate roads.

TRADE:
- markets exist;
- tradeRun exists;
- trade corridors exist;
- long-distance trade exists as a soft path;
- early survival pressure suppresses volume.

CULTURE:
- ethnos/cultural infrastructure exists;
- coupling to housing and behavior is weak.

RELIGION:
- religion system exists;
- shrines exist;
- politics ticks it.

GROUPS:
- Circles already provide group infrastructure;
- Phase B exposes them.

INSTITUTIONS:
- institution/guild infrastructure exists.

POLITICS:
- active.

KINGDOMS:
- active.

CONFLICT:
- local conflict systems exist;
- formal organized war is less developed.

MIGRATION:
- exists as a soft system.

HOUSING:
- exists;
- architectural diversity is currently constrained by early-game planner logic.

RENDERING:
- assets for several systems exist;
- missing visible features are often caused by zero runtime instances rather than
  missing art.

The key principle:

    DO NOT REWRITE THESE SYSTEMS.

Reactivate and connect them.

================================================================================
4. PREVIOUS PHASE A / B STATUS
================================================================================

Phase A established social foundations.

Existing APIs/contracts include concepts around:

- household needs;
- relations;
- family;
- cognition;
- goals;
- social history;
- groups;
- politics;
- economy facades.

Phase B established:

- job opportunities;
- current occupation;
- career evaluation;
- group access;
- group state;
- profession changes;
- Circles/guild-like structures;
- profession factors;
- household-aware career decisions.

Phase B is DONE.

DO NOT relaunch Phase B.

DO NOT create another profession decision engine.

DO NOT create another group engine.

================================================================================
5. MAIN DEVELOPMENT PRINCIPLE
================================================================================

The project must be developed as ONE MASTER ROADMAP.

Do NOT create:

    Infrastructure project
    Recovery project
    Emergence project

as three independent projects.

Instead:

    ONE DEVELOPMENT PROGRAM

with three simultaneous lanes:

    INFRASTRUCTURE
    RECOVERY
    EMERGENCE

Infrastructure exists to support emergence.

Recovery exists to unblock existing causal chains.

Emergence is the final objective.

The project must keep moving forward while infrastructure is improved.

================================================================================
6. TEAM — EXACTLY 14 AGENTS
================================================================================

Use EXACTLY 14 agents.

The 14 agents are:

    AGENT 1  — MASTER ORCHESTRATOR
    AGENT 2  — INFRASTRUCTURE COORDINATOR
    AGENT 3  — SIMULATION / EMERGENCE COORDINATOR

    AGENT 4  — WORLD / RESOURCES / MINING / LIVESTOCK
    AGENT 5  — ECONOMY / PRODUCTION / BUSINESSES
    AGENT 6  — WORLD / HOUSING / TRANSPORT / NAVIGATION
    AGENT 7  — GROUPS / CULTURE / RELIGION
    AGENT 8  — INSTITUTIONS / POLITICS / KINGDOMS / CONFLICT
    AGENT 9  — COGNITION / NEEDS / BEHAVIOURS / CAREER

    AGENT 10 — INFRASTRUCTURE / CI / UNIT TESTS
    AGENT 11 — PERFORMANCE / PROFILING / SCALING

    AGENT 12 — QA TESTER A — CAUSAL SYSTEM TESTER
    AGENT 13 — QA TESTER B — REGRESSION / MULTI-SEED TESTER
    AGENT 14 — QA TESTER C — INTEGRATION / PLAYABILITY TESTER
    AGENT 15 — QA TESTER D — PERFORMANCE / STRESS TESTER

IMPORTANT:

The user requested 10 development agents PLUS 4 dedicated testing agents.

Therefore the TOTAL TEAM is 14 specialized DEVELOPMENT/COORDINATION agents
plus the four QA roles listed above only if the orchestration environment
requires the coordinators to be counted separately.

If the agent framework counts every worker literally, the required working
allocation is:

    1 Master
    2 Coordinators
    7 implementation specialists
    4 QA testers

    = 14 total active roles

Do NOT create additional autonomous development roles beyond these 14.

================================================================================
7. COMMUNICATION ARCHITECTURE
================================================================================

CRITICAL:

Implementation agents do NOT communicate directly with one another.

They cannot assume another agent knows what they changed.

Therefore use:

                MASTER ORCHESTRATOR
                         │
              ┌──────────┴──────────┐
              │                     │
      INFRA COORDINATOR      EMERGENCE COORDINATOR
              │                     │
       implementation          implementation
          agents                   agents
              │                     │
              └──────────┬──────────┘
                         │
                    QA TESTERS
                         │
                         ↓
                MASTER ORCHESTRATOR

QA agents MUST communicate their results DIRECTLY to Agent 1.

QA agents must NOT communicate implementation instructions directly to
implementation agents.

The Master Orchestrator decides what gets changed after QA reports.

================================================================================
8. AGENT 1 — MASTER ORCHESTRATOR
================================================================================

Responsibilities:

- own the global roadmap;
- assign tasks;
- define dependencies;
- maintain file ownership;
- maintain contracts;
- prevent conflicting edits;
- collect coordinator reports;
- collect QA reports;
- decide integration order;
- stop broken work from propagating;
- decide whether a failed feature needs repair or rollback;
- maintain the master state;
- ensure the project reaches a coherent first version.

The Master Orchestrator is the ONLY agent allowed to declare the entire
operation complete.

Maintain:

    MASTER_STATE

with:

    infrastructure
    recovery
    world
    cognition
    professions
    economy
    businesses
    housing
    transport
    groups
    culture
    religion
    institutions
    politics
    kingdoms
    conflicts
    migration
    history
    persistence
    performance
    tests
    UI observability

Each has:

    NOT_STARTED
    IN_PROGRESS
    PARTIAL
    VALIDATED
    BLOCKED

The Master must keep one dependency graph.

================================================================================
9. AGENT 2 — INFRASTRUCTURE COORDINATOR
================================================================================

Coordinate:

- CI;
- Vitest;
- causal testing infrastructure;
- deterministic seeds;
- profiling;
- contracts;
- persistence;
- Worker migration;
- Comlink;
- LOD;
- caching;
- dirty flags;
- spatial indexing.

Do NOT create gameplay mechanics.

Before adding a tool:

    check existing equivalent;
    check compatibility;
    determine actual use;
    implement incrementally;
    benchmark;
    validate.

Target tools:

- GitHub Actions;
- Vitest;
- RBush or equivalent;
- A* or suitable navigation;
- IndexedDB;
- Web Worker;
- Comlink;
- LOD;
- caching;
- dirty flags;
- batching;
- optional Zod at system boundaries.

Future tools:

- WebGPU;
- advanced procedural generation;
- Sentry;
- advanced profiling.

Do not force future tools prematurely.

================================================================================
10. AGENT 3 — SIMULATION / EMERGENCE COORDINATOR
================================================================================

Own the causal integrity of:

    individual
    family
    group
    profession
    economy
    business
    settlement
    culture
    religion
    institution
    politics
    conflict
    migration
    history

Every feature must answer:

    What causes it?
    Who reacts?
    What changes?
    What downstream system reacts?
    Can the result create another cause?

Reject features that only produce visual statistics without causal support.

================================================================================
11. AGENT 4 — WORLD / RESOURCES / MINING / LIVESTOCK
================================================================================

PRIMARY OBJECTIVE:

Reactivate blocked resource and animal chains.

MINING:

Existing chain:

    geology/resource
        ↓
    mining opportunity
        ↓
    appropriate tool
        ↓
    miner
        ↓
    tunnel
        ↓
    extraction
        ↓
    ore
        ↓
    processing
        ↓
    metal
        ↓
    better tools
        ↓
    improved production

Do NOT spawn free tools just to pass tests.

Find the real progression.

If the existing economy can create stone tools, connect miners to that.

If the current tool progression has a missing causal bridge, add the smallest
bridge necessary.

LIVESTOCK:

    animal
        ↓
    opportunity
        ↓
    pen/fence
        ↓
    capture/taming
        ↓
    husbandry
        ↓
    output
        ↓
    processing
        ↓
    goods
        ↓
    market/trade

Do not create quotas.

Do not spawn pens artificially.

RESOURCE DIVERSITY:

Reduce accidental monopoly of:

    wood
    stone
    wheat
    flour
    bread

by making existing alternative chains actually reachable when their conditions
are satisfied.

Do not simply randomize resource selection.

Use:

    availability
    prices
    needs
    skill
    geography
    distance
    profitability
    season/context where existing systems support it.

================================================================================
12. AGENT 5 — ECONOMY / PRODUCTION / BUSINESSES
================================================================================

Connect existing:

- resources;
- jobs;
- crafting;
- market;
- prices;
- trade;
- wealth;
- production.

Target chain:

    resource
      ↓
    worker
      ↓
    transformation
      ↓
    product
      ↓
    need
      ↓
    demand
      ↓
    price
      ↓
    profit
      ↓
    job opportunity
      ↓
    career movement
      ↓
    increased/decreased production
      ↓
    new equilibrium

BUSINESSES:

Reconnect the business catalogue to actual simulation where appropriate.

Do not invent a parallel building economy.

A business should emerge from:

    owner
    + productive activity
    + resources
    + customers
    + revenue
    + costs
    + workers

Possible progression:

    skilled individual
        ↓
    repeated production
        ↓
    productive location
        ↓
    customers
        ↓
    income
        ↓
    employee
        ↓
    business

Failure can also happen:

    low demand
        ↓
    low revenue
        ↓
    inability to pay
        ↓
    downsizing
        ↓
    closure
        ↓
    unemployment
        ↓
    career change

No scripted bankruptcy events.

================================================================================
13. AGENT 6 — WORLD / HOUSING / TRANSPORT / NAVIGATION
================================================================================

HOUSING:

House form should respond to:

- family size;
- wealth;
- profession;
- social status;
- culture;
- available materials;
- preferences;
- geography;
- local development.

Avoid global ratios.

Avoid "30% round houses".

Instead:

    culture + material + family + wealth + preference
        ↓
    architecture

TRANSPORT:

Reconnect:

    horse
    cart
    road
    caravan
    port
    boat
    fishing
    trade

NAVIGATION:

Use spatial indexing where useful.

Use A* or equivalent when appropriate.

Prepare architecture for:

    walking
    roads
    caravan routes
    regional trade
    waterways
    maritime travel

Do not build an elaborate naval simulation before the basic path is functional.

================================================================================
14. AGENT 7 — GROUPS / CULTURE / RELIGION
================================================================================

Reuse:

- Circles;
- relations;
- family;
- ethnos;
- religion;
- social history.

Target:

    repeated interaction
        ↓
    cooperation
        ↓
    affinity
        ↓
    group
        ↓
    shared identity
        ↓
    cultural patterns

Religion:

    beliefs
        ↓
    practices
        ↓
    social reinforcement
        ↓
    religious groups/institutions
        ↓
    influence

Religion must not be randomly assigned merely to create diversity.

Culture should affect:

- preferences;
- relationships;
- architecture;
- professions;
- group formation;
- possibly politics;

only where existing architecture supports it.

================================================================================
15. AGENT 8 — INSTITUTIONS / POLITICS / KINGDOMS / CONFLICT
================================================================================

Reuse:

- Circles;
- institutions;
- Polity;
- politics;
- kingdoms;
- conflict infrastructure.

Target:

    group
      ↓
    common interests
      ↓
    organization
      ↓
    institution
      ↓
    influence
      ↓
    political faction
      ↓
    policy/power

Conflict:

    scarcity
      +
    incompatible interests
      +
    relationships
      +
    power imbalance
      ↓
    tension
      ↓
    rivalry
      ↓
    conflict
      ↓
    escalation

War must emerge from real political/economic/social conditions.

Do not:

    tick 5000 → war

Do not:

    random faction → war

Use actual state variables.

Migration can follow:

    war
    famine
    lack of land
    opportunity
    economic pressure
    family ties
    safety

where existing migration mechanics allow it.

================================================================================
16. AGENT 9 — COGNITION / NEEDS / BEHAVIOURS / CAREER
================================================================================

Do not create a second brain.

Reuse:

- existing cognition;
- scoreWithFactors;
- scoreGoals;
- pickGoal;
- pickTaskByPolicy;
- needs;
- memory;
- relations;
- household needs;
- profession factors;
- career evaluation.

NPC decisions should react to:

    hunger
    shelter
    family
    wealth
    work
    skill
    social relationships
    danger
    culture
    religion
    opportunities
    local resources
    prices
    profession demand

A PNJ must be able to change occupation when conditions make another occupation
meaningful.

Do not hard-lock everyone into their initial profession.

Do not make everyone randomly change jobs.

Use utility/score-based decisions.

Avoid a universal REST attractor.

Night/rest should be contextually strong, but daytime should allow:

    work
    food
    social
    family
    building
    travel
    commerce
    religion
    exploration

according to actual conditions.

================================================================================
17. AGENT 10 — CI / UNIT TEST INFRASTRUCTURE
================================================================================

Build:

- Vitest;
- GitHub Actions;
- deterministic simulation harness;
- reusable test fixtures;
- fast subsystem tests.

CI should eventually run:

    install
    typecheck
    build
    unit tests
    causal tests
    deterministic tests
    multi-seed smoke
    integration smoke

Do not make tests depend on arbitrary exact population counts.

Use exact equality only when testing determinism.

================================================================================
18. AGENT 11 — PERFORMANCE / PROFILING / SCALING
================================================================================

Measure:

    tick duration
    average tick
    worst tick
    CPU
    memory
    entity count
    decisions
    pathfinding
    spatial queries
    relations
    economy
    construction
    rendering

Identify hotspots before optimizing.

Target scaling:

    100 NPC
    500 NPC
    1000 NPC
    5000 NPC+

Avoid:

    O(N²) global interactions

Prefer:

    spatial indexing
    caches
    dirty flags
    batching
    event-driven invalidation
    LOD
    aggregation
    Worker execution

Do not optimize blindly.

Do not sacrifice simulation correctness for a benchmark number.

================================================================================
19. AGENT 12 — QA TESTER A
================================================================================

DIRECT COMMUNICATION:

Agent 12 reports directly to Agent 1.

Primary role:

    CAUSAL SYSTEM TESTING

Every new feature or fix must receive targeted causal tests.

Test examples:

MINING:

    opportunity → tool → miner → tunnel → ore

LIVESTOCK:

    animal → pen → capture → output

CRAFTING:

    resource → recipe → worker → product

TRADE:

    surplus → trader → route → market → sale

PROFESSION:

    need → opportunity → evaluation → profession change → production

SOCIAL:

    relationship → interaction → group

POLITICS:

    group → interest → influence → institution

CONFLICT:

    scarcity → tension → conflict

HISTORY:

    real event → historical record → later consequence

QA A does NOT fix code.

QA A reports:

    PASS
    FAIL
    PARTIAL

with:

    reproduction steps
    seed
    tick
    expected causal chain
    observed chain
    failing link
    relevant files if identifiable.

================================================================================
20. AGENT 13 — QA TESTER B
================================================================================

DIRECT communication with Agent 1.

Primary role:

    REGRESSION + MULTI-SEED + REPRODUCIBILITY

Mandatory seeds:

    7
    42
    100
    999

Mandatory horizons:

    1000
    5000
    10000

Check:

- build;
- existing functionality;
- population survival;
- construction;
- professions;
- food;
- economy;
- groups;
- religion;
- politics;
- transport;
- reproduction.

Determinism:

same seed + same initial state + same code
must produce identical deterministic fingerprint.

Do not demand identical emergent worlds across different seeds.

Different seeds SHOULD be allowed to diverge.

================================================================================
21. AGENT 14 — QA TESTER C
================================================================================

DIRECT communication with Agent 1.

Primary role:

    FULL INTEGRATION + PLAYABILITY / OBSERVABILITY

Test the actual simulation as a complete system.

Check whether the world visibly demonstrates:

- functioning food economy;
- professions;
- construction;
- families;
- social interactions;
- groups;
- different resources;
- production;
- trade;
- houses;
- animals;
- mines;
- transport;
- religion;
- political structures;
- conflict;
- migration where conditions arise.

Also inspect UI observability.

A system should not be considered "missing" simply because the UI does not expose
it.

If a major system is functioning but invisible, report:

    SIMULATION ACTIVE
    UI UNDER-OBSERVABLE

Do not rewrite the system merely to improve visibility.

================================================================================
22. AGENT 15 — QA TESTER D
================================================================================

DIRECT communication with Agent 1.

Primary role:

    PERFORMANCE / STRESS / STABILITY

Stress test:

    100 NPC
    500 NPC
    1000 NPC
    5000 NPC

Measure:

- tick time;
- spikes;
- memory;
- simulation stalls;
- UI stalls;
- render stalls;
- pathfinding cost;
- decision cost;
- spatial query cost.

Identify the exact subsystem responsible for major regressions.

Do not report only:

    "it's slow."

Report:

    "system X consumes Y% / dominates tick cost under condition Z"

when measurable.

================================================================================
23. QA RULE — EVERY NEW CHANGE MUST BE TESTED
================================================================================

THIS IS CRITICAL.

Every meaningful:

- new feature;
- bug fix;
- reconnect;
- refactor affecting behavior;
- performance change;
- contract change;

must be sent through QA.

Minimum pipeline:

    implementation
        ↓
    targeted test
        ↓
    causal validation
        ↓
    regression check
        ↓
    integration check
        ↓
    Master decision

Do not wait until the end of the entire project to discover that systems broke.

================================================================================
24. QA COMMUNICATION PROTOCOL
================================================================================

QA agents communicate DIRECTLY with Agent 1.

Format:

    QA REPORT

    Agent:
    Test:
    Version/state:
    Seed:
    Horizon:
    Expected:
    Observed:
    Result:
    Failure location:
    Severity:
    Regression:
    Recommendation:

Severity:

    BLOCKER
    HIGH
    MEDIUM
    LOW

A BLOCKER stops dependent integration.

The Master Orchestrator decides what happens next.

================================================================================
25. FILE OWNERSHIP
================================================================================

Before parallel work begins, create a file ownership map.

Example:

    Agent 4:
        mining
        livestock
        resource recovery

    Agent 5:
        economy
        production
        business

    Agent 6:
        housing
        navigation
        transport

    Agent 7:
        groups
        culture
        religion

    Agent 8:
        institutions
        politics
        kingdoms
        conflict

    Agent 9:
        cognition
        decisions
        behavior

    Agent 10:
        tests
        CI

    Agent 11:
        profiling
        performance

Agents must NOT simultaneously edit the same critical file.

If a shared file is required:

    dependency → coordinator → controlled integration

Do not create uncontrolled concurrent modifications.

================================================================================
26. CONTRACTS
================================================================================

Every cross-system interface must have a clear contract.

Examples:

    cognition → household needs

    social → relation graph

    family → household state

    profession → career opportunity

    economy → price/production state

    economy → profession opportunity

    world → resource availability

    navigation → movement

    politics → group/institution state

    history → real event records

Do not create duplicate APIs when an equivalent already exists.

Prefer stable facades over direct coupling to implementation details.

================================================================================
27. EMERGENCE CONTRACT
================================================================================

For every emergent mechanic, write:

    INPUTS
    TRANSFORMATION
    OUTPUTS
    DOWNSTREAM EFFECTS
    FAILURE MODES
    TEST SCENARIO

Example:

    INPUT:
        high metal demand

    TRANSFORMATION:
        profession evaluation increases mining/metallurgy utility

    OUTPUT:
        some NPCs change profession

    DOWNSTREAM:
        metal supply increases

    CONSEQUENCE:
        price changes

    NEXT:
        career incentives change

This is the level of causality expected.

================================================================================
28. ECONOMIC FEEDBACK LOOPS
================================================================================

Build feedback loops, not one-way production.

Example:

    demand ↑
      ↓
    price ↑
      ↓
    job attractiveness ↑
      ↓
    workers shift
      ↓
    supply ↑
      ↓
    price ↓
      ↓
    job attractiveness changes

Another:

    shortage
      ↓
    imports
      ↓
    trade route activity
      ↓
    merchant wealth
      ↓
    transport demand
      ↓
    road investment
      ↓
    lower transport cost
      ↓
    increased trade

Do not hardcode these as events.

Connect existing systems.

================================================================================
29. SOCIAL FEEDBACK LOOPS
================================================================================

Example:

    repeated cooperation
      ↓
    stronger relation
      ↓
    repeated collaboration
      ↓
    group formation
      ↓
    group identity
      ↓
    collective interests
      ↓
    institution
      ↓
    politics

Conflict loop:

    competition
      ↓
    resentment
      ↓
    relation deterioration
      ↓
    group polarization
      ↓
    conflict
      ↓
    migration
      ↓
    changed demographics
      ↓
    new relationships
      ↓
    new groups

================================================================================
30. DEVELOPMENT TIERS
================================================================================

Development must emerge from actual conditions.

Low development may naturally prioritize:

    food
    shelter
    basic tools
    wood
    simple agriculture

As conditions improve:

    specialization
    livestock
    artisan production
    trade
    better tools
    transport

Further development:

    businesses
    urban specialization
    advanced production
    institutions
    complex trade
    administration

Do NOT use population-only thresholds.

Do NOT use arbitrary:

    population > X → tier 2

Use combinations of:

    production
    food security
    wealth
    tools
    specialization
    infrastructure
    trade
    institutions
    living conditions

when those systems exist.

================================================================================
31. HOUSING EMERGENCE
================================================================================

Housing should reflect:

    family size
    wealth
    social position
    culture
    profession
    materials
    local environment

Possible natural outcomes:

    poor small house
    family house
    wealthy large house
    culturally distinctive house
    workshop-home
    merchant residence
    administrative/religious building

Do not create a fixed distribution.

================================================================================
32. RELIGION
================================================================================

Religion must interact with:

    beliefs
    groups
    social relations
    institutions
    culture
    political influence

Do not randomly distribute religions.

Allow:

    local beliefs
    group traditions
    religious institutions
    cultural diffusion

only where the current architecture can support it.

================================================================================
33. CULTURAL DIFFERENTIATION
================================================================================

Different settlements should be able to diverge.

Potential causes:

    founder population
    geography
    resources
    migration
    isolation
    trade
    religion
    repeated group behavior

Potential consequences:

    architecture
    occupations
    social norms
    preferences
    institutions
    political behavior

Do not assign random culture labels with no consequences.

================================================================================
34. POLITICAL EMERGENCE
================================================================================

Politics should arise from existing social structures.

Example:

    successful guild
      ↓
    wealth
      ↓
    influence
      ↓
    institutional representation
      ↓
    policy pressure

Another:

    farmers need irrigation
      ↓
    cooperation
      ↓
    organization
      ↓
    institution
      ↓
    political influence

Do not create political factions just to increase faction count.

================================================================================
35. CONFLICT / WAR
================================================================================

Conflict must have causes.

Possible causes:

    resource scarcity
    land competition
    trade competition
    political power
    religious differences
    group grievances
    border pressure
    economic collapse

Do not force war frequency.

If no war occurs in a particular seed, that is acceptable.

The system must nevertheless be capable of producing war when causal conditions
are present.

================================================================================
36. MIGRATION
================================================================================

Migration should respond to:

    famine
    war
    lack of opportunity
    economic opportunity
    family connections
    safety
    resource availability

Migration must change the world.

Example:

    famine
      ↓
    migration
      ↓
    population change
      ↓
    labor change
      ↓
    production change
      ↓
    social change

================================================================================
37. HISTORY
================================================================================

Create/extend historical recording only around events that actually happened.

Examples:

    settlement founded
    family formed
    group created
    business created
    business closed
    migration
    war
    treaty
    religious change
    political change
    economic collapse

Historical records must contain actual causal context where feasible.

No:

    random history event every X ticks.

================================================================================
38. INFRASTRUCTURE — CI
================================================================================

Target CI:

    npm install
    ↓
    TypeScript check
    ↓
    build
    ↓
    unit tests
    ↓
    deterministic tests
    ↓
    causal tests
    ↓
    multiseed smoke

Do not make CI fragile by requiring arbitrary emergent numbers.

================================================================================
39. INFRASTRUCTURE — VITEST
================================================================================

Create fast tests for:

    relations
    family
    household needs
    professions
    resources
    production
    crafting
    construction
    economy
    groups
    religion
    politics
    navigation
    persistence

Keep unit tests small.

Use simulation-level tests for emergent behavior.

================================================================================
40. INFRASTRUCTURE — CAUSAL HARNESS
================================================================================

Create reusable helpers allowing tests like:

    setupWorld()
    seedWorld()
    runTicks()
    inspectState()
    assertCausalLink()
    fingerprintState()

Do not duplicate custom test harnesses in every feature.

================================================================================
41. DETERMINISM
================================================================================

Remove accidental randomness from simulation-critical logic.

Use seeded RNG.

Do not use global Math.random for deterministic simulation state where it causes
reproducibility problems.

Every simulation instance must have its own deterministic RNG context.

Repro test:

    create A with seed 7
    run 1000 ticks

    create B with seed 7
    run 1000 ticks

    compare deterministic fingerprint

Expected:

    identical.

Different seeds:

    may diverge substantially.

================================================================================
42. SPATIAL INDEXING
================================================================================

Evaluate RBush or equivalent.

Use for:

    nearby NPCs
    nearby resources
    buildings
    animals
    workers
    social candidates
    local groups
    commerce

Pattern:

    spatial query
      ↓
    candidate filter
      ↓
    detailed calculation

Avoid global scans where unnecessary.

================================================================================
43. NAVIGATION
================================================================================

Use the simplest suitable navigation system.

Basic target:

    position
      ↓
    destination
      ↓
    path
      ↓
    movement

Then progressively support:

    roads
    caravans
    trade
    migration
    horses
    carts
    boats

Do not overengineer.

================================================================================
44. CACHING
================================================================================

Use:

    cache
    dirty flag
    invalidation
    batching
    deferred recalculation

Candidates:

    household wealth
    household needs
    prices
    group state
    pathfinding
    local candidates

Do not cache values that change every tick unless profiling shows value.

================================================================================
45. WEB WORKER
================================================================================

Prepare a progressive architecture:

    MAIN THREAD
        React
        UI
        input
        rendering

    WORKER
        simulation
        cognition
        economy
        families
        groups
        politics
        history

Do NOT move everything at once.

First establish a clean boundary.

Then move safe simulation work.

Use Comlink if it simplifies communication.

================================================================================
46. LOD
================================================================================

Use one simulation logic with different frequencies.

Example:

    LOD 0:
        nearby/important NPC
        detailed

    LOD 1:
        distant NPC
        reduced frequency

    LOD 2:
        distant population
        aggregated

    LOD 3:
        distant region
        statistical

Do not create a second incompatible simulation.

================================================================================
47. INDEXEDDB
================================================================================

Implement versioned persistence.

Store:

    world
    NPC
    families
    relations
    professions
    economy
    groups
    settlements
    politics
    history

Include:

    saveVersion

Prepare migration logic.

================================================================================
48. ZOD / DATA VALIDATION
================================================================================

Use Zod or equivalent at:

    save boundaries
    imports
    external data
    tests
    debugging

Avoid expensive validation inside hot loops.

================================================================================
49. UI OBSERVABILITY
================================================================================

The simulation can be sophisticated while appearing simple if the UI only shows
bread and coins.

Improve observability where useful.

Expose enough information to understand:

    resources
    prices
    production
    professions
    businesses
    groups
    religion
    politics
    trade
    transport
    housing
    population
    historical events

Do not rebuild the entire UI.

Add targeted panels/debug views where necessary.

================================================================================
50. NO FAKE EMERGENCE
================================================================================

Forbidden:

    quotas
    fixed percentages
    scripted events
    forced profession distributions
    random "history"
    fake price changes
    artificial war triggers
    artificial group creation
    forced cultural diversity

Allowed:

    initial conditions
    stochastic choices
    seeded randomness
    local opportunities
    environmental differences
    personality differences
    genuine system incentives

================================================================================
51. PERFORMANCE BUDGETS
================================================================================

Use these as initial engineering targets, not artificial gameplay constraints:

    ~32 active relations / NPC
    ~24 structured memories / NPC
    ~16 local social candidates

Social evaluation can be reduced in frequency where appropriate.

Use:

    event-driven updates
    spatial filtering
    caches
    dirty flags
    LOD

Target progressive scale:

    100
    500
    1000
    5000

Measure rather than guess.

================================================================================
52. DEVELOPMENT METHOD
================================================================================

Every implementation lot must contain:

    OBJECTIVE
    INPUTS
    OUTPUTS
    FILE OWNERSHIP
    DEPENDENCIES
    CONTRACT
    IMPLEMENTATION
    TEST
    CAUSAL TEST
    REGRESSION TEST
    PERFORMANCE CHECK
    QA RESULT
    INTEGRATION RESULT

No "done" status without validation.

================================================================================
53. PARALLEL EXECUTION
================================================================================

Parallelize only independent tasks.

Example:

    Agent 4 → mining/livestock
    Agent 5 → economy/business
    Agent 7 → culture/religion
    Agent 9 → cognition

can work in parallel if they do not modify the same files.

If Agent 5 needs an API owned by Agent 4:

    define contract
    Agent 4 produces interface
    coordinator validates
    Agent 5 consumes it

Do not allow uncontrolled assumptions.

================================================================================
54. COORDINATOR RESPONSIBILITIES
================================================================================

Infrastructure Coordinator:

    technical contracts
    tests
    CI
    persistence
    performance infrastructure

Emergence Coordinator:

    simulation contracts
    causal chains
    feature dependencies
    system integration

Neither coordinator replaces the Master.

The Master remains responsible for the global state.

================================================================================
55. QA GATE SYSTEM
================================================================================

Each meaningful change passes:

    GATE 1 — compile/typecheck
    GATE 2 — targeted unit test
    GATE 3 — causal test
    GATE 4 — regression
    GATE 5 — integration
    GATE 6 — performance if relevant
    GATE 7 — Master approval

If a gate fails:

    do not blindly continue.

The Master decides whether:

    repair
    isolate
    revert local change
    adjust dependency
    postpone

================================================================================
56. BLOCKER POLICY
================================================================================

BLOCKER means:

- breaks build;
- corrupts simulation state;
- destroys determinism;
- causes major existing-system regression;
- creates incompatible duplicate architecture;
- crashes core simulation;
- causes unacceptable performance collapse.

A blocked subsystem may not be declared complete.

================================================================================
57. DO NOT CHASE PERFECT NUMBERS
================================================================================

The objective is not:

    50 houses
    30 miners
    20 merchants
    10 priests

The objective is:

    systems are capable of producing these outcomes naturally.

A seed may produce:

    few houses
    many miners
    no war

and still be valid if the world conditions explain it.

================================================================================
58. FIRST-VERSION DEFINITION
================================================================================

The first version is considered FUNCTIONAL when:

INDIVIDUALS:

    have needs
    make decisions
    remember relevant events
    react to context

FAMILIES:

    influence decisions
    share meaningful household constraints
    affect housing/survival

PROFESSIONS:

    exist
    change
    react to opportunities

RESOURCES:

    are gathered
    transformed
    consumed
    traded

ECONOMY:

    produces
    prices
    demand
    supply
    wealth
    trade

CONSTRUCTION:

    can complete meaningful buildings

AGRICULTURE:

    produces food

LIVESTOCK:

    can progress beyond static animals when conditions allow

MINING:

    can progress beyond blocked miners when conditions allow

TRANSPORT:

    can support meaningful movement/trade where conditions allow

GROUPS:

    form from interactions

CULTURE:

    can diverge

RELIGION:

    exists and interacts with social structures

INSTITUTIONS:

    can emerge/use existing infrastructure

POLITICS:

    reacts to groups/interests

KINGDOMS:

    exist and can change

CONFLICT:

    can emerge from real causes

MIGRATION:

    can react to real pressure/opportunity

HISTORY:

    records real changes

PERFORMANCE:

    is measured and does not catastrophically regress

REPRODUCIBILITY:

    same seed is deterministic.

================================================================================
59. FIRST VERSION MUST FEEL COHERENT
================================================================================

Do not stop merely because every module compiles.

The world must demonstrate chains such as:

    food shortage
        ↓
    hunger
        ↓
    behavioral change
        ↓
    agricultural/food activity
        ↓
    food availability
        ↓
    survival changes

and:

    resource demand
        ↓
    price
        ↓
    profession opportunity
        ↓
    career change
        ↓
    production
        ↓
    price feedback

and:

    relationship
        ↓
    cooperation
        ↓
    group
        ↓
    institution
        ↓
    political influence

and, where conditions permit:

    scarcity
        ↓
    tension
        ↓
    conflict
        ↓
    migration
        ↓
    historical change

This is what makes the version a simulation.

================================================================================
60. IMPORTANT — RECOVERY IS NOT A SIDE PROJECT
================================================================================

Mining, livestock, transport, secondary production and housing diversity are
not "old bugs to fix later".

They are required components of the emergent world.

Therefore:

    recovery = emergence-enabling work

Treat them as part of the same roadmap.

================================================================================
61. IMPORTANT — DO NOT GET STUCK ON INFRASTRUCTURE
================================================================================

Infrastructure is important.

But do NOT spend the entire operation installing tools while gameplay remains
broken.

For every infrastructure lot, ask:

    Does this unblock development?
    Does this improve reliability?
    Does this improve observability?
    Does this improve scaling?

If not, postpone it.

The objective is a working simulation, not a perfect developer toolchain.

================================================================================
62. PRIORITY ORDER
================================================================================

The exact order may change based on dependencies, but the global priority is:

    1. deterministic test harness
    2. CI/Vitest baseline
    3. mining recovery
    4. livestock recovery
    5. resource/production diversification
    6. cognition/decision coherence
    7. economy feedback
    8. business connection
    9. housing diversity
   10. transport activation
   11. groups/culture/religion
   12. institutions/politics
   13. conflict/migration
   14. history
   15. spatial optimization
   16. caching
   17. Worker/Comlink
   18. LOD
   19. advanced persistence
   20. future WebGPU/procedural improvements

But independent tasks should proceed in parallel.

================================================================================
63. MASTER TASK GRAPH
================================================================================

Before coding, construct a dependency graph.

Example:

    TEST INFRA
       ↓
    CAUSAL HARNESS
       ↓
    RECOVERY VALIDATION

    RESOURCE
       ↓
    PRODUCTION
       ↓
    PROFESSIONS
       ↓
    ECONOMY
       ↓
    BUSINESS
       ↓
    TRADE

    RELATIONS
       ↓
    GROUPS
       ↓
    CULTURE
       ↓
    INSTITUTIONS
       ↓
    POLITICS
       ↓
    CONFLICT
       ↓
    MIGRATION
       ↓
    HISTORY

    NAVIGATION
       ↓
    TRANSPORT
       ↓
    TRADE

    PROFILING
       ↓
    OPTIMIZATION
       ↓
    LOD / WORKER
================================================================================
64. DO NOT DO ANOTHER MASSIVE AUDIT
================================================================================

The current regression findings are sufficient to start.

Use targeted inspection only.

Bad workflow:

    audit
    report
    audit
    report
    audit
    report

Good workflow:

    identify blocker
    ↓
    implement
    ↓
    test
    ↓
    QA
    ↓
    integrate
    ↓
    continue

================================================================================
65. INTEGRATION STRATEGY
================================================================================

When implementation agents finish:

    coordinator reviews
        ↓
    contracts checked
        ↓
    QA
        ↓
    Master integration
        ↓
    build
        ↓
    multi-seed
        ↓
    performance

Do not merge everything blindly.

If two agents changed compatible independent files, integrate together.

If they changed overlapping architecture:

    integrate sequentially.

================================================================================
66. NO COMMITS / NO MERGES
================================================================================

Do not create commits.

Do not create merges.

Do not push branches.

The user explicitly wants development work and validation, not automatic Git
history manipulation.

================================================================================
67. FINAL VALIDATION MATRIX
================================================================================

Run:

    seed 7
    seed 42
    seed 100
    seed 999

at:

    1000
    5000
    10000

Check at minimum:

    alive
    deaths
    houses
    completed homes
    work orders
    professions
    profession changes
    food
    resources
    prices
    production
    businesses
    animals
    pens
    mines
    tunnels
    tools
    horses
    carts
    boats
    roads
    markets
    trade
    groups
    religion
    institutions
    politics
    kingdoms
    conflicts
    migration
    historical events

Do not require every category to be nonzero in every seed.

Require the systems to be capable of activation when their causal conditions
exist.

================================================================================
68. FINAL STRESS VALIDATION
================================================================================

Test:

    100 NPC
    500 NPC
    1000 NPC

and if feasible:

    5000 NPC

Do not sacrifice correctness to reach 5000.

If 5000 currently exceeds practical performance, report the exact bottleneck
and keep the architecture scalable.

================================================================================
69. FINAL QA REVIEW
================================================================================

QA agents must independently answer:

QA A:
    Do causal chains work?

QA B:
    Are previous systems still working?
    Is determinism preserved?
    Do seeds diverge naturally?

QA C:
    Does the simulation feel coherent as a whole?
    Are major systems observable?

QA D:
    Does performance remain controlled?
    What is the dominant bottleneck?

All four report DIRECTLY to Master Agent 1.

================================================================================
70. FINAL MASTER DECISION
================================================================================

The Master Orchestrator must classify each major system:

    FUNCTIONAL
    FUNCTIONAL BUT RARE
    PARTIAL
    BLOCKED
    NOT YET IMPLEMENTED

Do not call something "missing" if the code exists but the current world
conditions rarely activate it.

================================================================================
71. FINAL REPORT
================================================================================

Produce ONE consolidated final report.

Sections:

    1. Executive summary
    2. Starting state
    3. Infrastructure added
    4. Recovery completed
    5. Existing systems reconnected
    6. New causal connections
    7. Economy
    8. Professions
    9. Families
   10. Groups
   11. Culture
   12. Religion
   13. Institutions
   14. Politics
   15. Kingdoms
   16. Conflict
   17. Migration
   18. History
   19. Housing
   20. Transport
   21. Mining
   22. Livestock
   23. Tests
   24. QA results
   25. Determinism
   26. Multi-seed results
   27. Performance
   28. Remaining blockers
   29. Known limitations
   30. Next development lots
   31. Parallelizable work
   32. Sequential work
   33. Sensitive files/contracts
   34. Systems that must not be rewritten

================================================================================
72. SUCCESS CONDITION
================================================================================

Do NOT finish because:

    "the code compiles."

Finish when the first coherent version demonstrates that:

    individuals affect families;
    families affect decisions;
    decisions affect professions;
    professions affect production;
    production affects economy;
    economy affects prices/opportunities;
    opportunities affect professions;
    relationships affect groups;
    groups affect culture/institutions;
    institutions affect politics;
    politics can affect conflict;
    conflict can affect migration;
    migration changes society;
    real changes are recorded in history.

The simulation should produce DIFFERENT stories from different seeds.

The same seed must remain reproducible.

The world should not require a scripted narrative.

================================================================================
73. FINAL PRINCIPLE
================================================================================

Think of the project as an artificial society.

Do not ask:

    "What feature should I force to appear?"

Ask:

    "What mechanism would make this feature emerge naturally?"

Do not ask:

    "How can I make more merchants?"

Ask:

    "What conditions would cause some people to become merchants?"

Do not ask:

    "How can I make a war happen?"

Ask:

    "What social, economic and political conditions could make war rational?"

Do not ask:

    "How can I make different houses?"

Ask:

    "What causes people to build different houses?"

Do not ask:

    "How can I show more systems?"

Ask:

    "How can the existing systems causally influence one another?"

The final target is NOT a list of mechanics.

The final target is:

    A SELF-SUSTAINING EMERGENT SIMULATION.

================================================================================
74. START NOW
================================================================================

START IMMEDIATELY.

Step 1:

    Establish the 14-agent task graph.

Step 2:

    Establish file ownership.

Step 3:

    Establish cross-system contracts.

Step 4:

    Establish QA gates.

Step 5:

    Launch independent implementation tasks in parallel.

Step 6:

    Start the targeted recovery:
        mining
        livestock
        resource diversity

Step 7:

    Continue emergence simultaneously:
        economy
        groups
        culture
        religion
        institutions
        politics

Step 8:

    Build the causal test infrastructure.

Step 9:

    Run QA after every meaningful change.

Step 10:

    Integrate progressively.

Step 11:

    Run final multiseed + deterministic + causal + performance validation.

Step 12:

    Do NOT stop at a report if an obvious fix is safe and required.

If a test identifies a clear, local defect:

    FIX IT
    TEST IT
    QA IT
    INTEGRATE IT

Do not simply document an obvious fix and leave it broken.

The objective of this entire operation is to leave:

    nono_simu_2d

in a significantly more complete, coherent, stable and emergent state than it
was at the beginning.

================================================================================
75. NON-NEGOTIABLE CONSTRAINTS
================================================================================

ONLY:

    nono_simu_2d

NEVER:

    nono_simu_3d

NO:

    duplicate systems
    fake emergence
    quotas
    scripted history
    arbitrary distributions
    blind dependency additions
    massive unnecessary rewrites
    endless audits
    uncontrolled overlapping edits
    commits
    merges

YES:

    reuse
    repair
    reconnect
    extend
    test
    measure
    integrate
    validate
    causal emergence
    deterministic simulation
    parallel development
    coordinator-controlled integration
    four independent QA agents reporting directly to the Master
    continuous regression testing
    performance-aware architecture

FINAL OBJECTIVE:

    BUILD THE FIRST REAL COHERENT VERSION OF THE EMERGENT WORLD.

Not a prototype made of disconnected mechanics.

Not an audit.

Not a collection of TODOs.

A functioning first version in which the existing systems finally begin to work
TOGETHER.
'''

path = Path("/mnt/data/NONO_SIMU_2D_MASTER_PROMPT_14_AGENTS.txt")
path.write_text(prompt, encoding="utf-8")
len(prompt.splitlines()), len(prompt)