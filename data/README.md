# Project data

This folder is the master copy of the data center pipeline. The map in `../map` reads these files.

| File | What it holds |
|---|---|
| `projects.csv` | One row per project or campus |
| `clusters.csv` | One row per region: where its bubble sits on the map and slide |

> **The rows currently in `projects.csv` are anonymised SAMPLE data** (`Confidence = SAMPLE - replace`). Names and MW values are made up. Replace them with real projects.

## Rules

- One row per project. `ID` is unique and never reused (`DE-0001`, `DE-0002`, ...).
- Split capacity across the four MW columns (operating / under construction / development / announced). The map adds them up.
- Coordinates in decimal degrees with a dot: `50.1109`, `8.6821`.
- Every row needs `Source_1` and `Last_Verified` (YYYY-MM-DD).
- `Cluster` must match a name in `clusters.csv`.
- Use exactly the allowed values listed below for Status and other list columns.

## Opening in Excel (German settings)

Excel with German settings expects `;` instead of `,`, so a double-click can put everything in one column. Instead use **Daten → Aus Text/CSV**, pick the file, and Excel detects the columns. When saving back, choose **CSV UTF-8 (durch Trennzeichen getrennt)**. The map reads both `,` and `;` files.

## Columns

| Column | Priority | Meaning | Example |
|---|---|---|---|
| `ID` | **Required** | Unique, never reused (e.g. DE-0001). Links slides, map pop-ups and history. | DE-0001 |
| `Project_Name` | **Required** | Campus or project name (operator code such as FRA5 if known). | Hanau Campus Phase 1 |
| `Promoter` | **Required** | Developer / sponsor shown on the slide (column 'PROMOTER'). | Example Developer A |
| `Operator` | Recommended | Who operates the IT / facility (may differ from owner). | Example Colo B |
| `Owner_UBO` | Optional | Ultimate beneficial owner of the building / land. | Example Infra Fund C |
| `Owner_Country` | Optional | HQ country of the UBO. | United States |
| `Owner_Type` | Optional | Operator / developer / investor / JV. | Investor / Infrastructure fund |
| `End_User_Tenant` | Optional | Anchor tenant / hyperscaler if known (often confidential). | Hyperscaler (undisclosed) |
| `DC_Type` | Recommended | Hyperscale, colocation, AI/HPC, enterprise ... | Colocation - wholesale |
| `Status` | **Required** | Drives map colour and slide grouping. Use the project's most advanced phase. | Under construction |
| `Construction_Stage` | Optional | Only when Status = Under construction. | Shell & core |
| `Status_Note` | **Required** | Short text printed in the slide STATUS column (max ~60 characters). | 60 MW live; Ph. 2 (100 MW) under construction |
| `Site_Address` | Optional | Street / business park / Flurstück. | Gewerbegebiet Nord |
| `City` | **Required** | Municipality shown in LOCATION column. | Hanau |
| `District_Landkreis` | Optional | Landkreis / kreisfreie Stadt. | Main-Kinzig-Kreis |
| `Bundesland` | Recommended | Federal state. | Hessen |
| `Postcode` | Optional | PLZ (text). | 63450 |
| `Cluster` | **Required** | Market cluster used for the bubbles (must match a name on the Clusters sheet). | Frankfurt / Rhein-Main |
| `Latitude` | **Required** | WGS84 decimal degrees (right-click in Google Maps → copy). | 50.1322 |
| `Longitude` | **Required** | WGS84 decimal degrees. | 8.9169 |
| `Location_Precision` | Recommended | How exact the pin is. | Business park |
| `MW_Operating` | **Required** | Capacity already live (MW). | 60 |
| `MW_Under_Construction` | **Required** | Capacity in construction (MW). | 100 |
| `MW_Development` | **Required** | Capacity in development (land + permitting/grid in progress). | 0 |
| `MW_Announced` | **Required** | Capacity only announced / speculative (MW). | 0 |
| `Capacity_Basis` | **Required** | Whether MW are IT load or grid connection. Do NOT mix silently. | IT load (critical) |
| `Grid_Connection_MW` | Recommended | Requested / contracted grid capacity (MW). | 180 |
| `Grid_Operator` | Recommended | TSO / DSO (Amprion, TenneT, 50Hertz, TransnetBW, Syna, Westnetz ...). | Example DSO |
| `Grid_Status` | Recommended | Single best predictor of real delivery in Germany. | Contracted (Netzanschlussvertrag) |
| `Voltage_kV` | Optional | Connection voltage (110 / 220 / 380 kV). | 110 |
| `Planning_Status` | Recommended | Bauleitplanung / permit stage. | Baugenehmigung |
| `Land_Area_ha` | Optional | Plot size (ha). | 8.5 |
| `Building_GFA_m2` | Optional | Gross floor area (m²). | 45000 |
| `Announcement_Date` | Recommended | First public announcement. | 2023-05-10 |
| `Construction_Start` | Optional | Groundbreaking date. | 2024-09-01 |
| `COD_First_Phase` | Recommended | Commercial operation date, first phase. | 2026-06-30 |
| `COD_Full_Buildout` | Optional | Full build-out date. | 2029-12-31 |
| `Design_PUE` | Optional | Operator design PUE (EnEfG requires ≤1.2 for new DCs from 2026). | 1.2 |
| `Cooling` | Optional | Air / adiabatic / liquid / hybrid. | Hybrid (DLC-ready) |
| `Heat_Reuse` | Optional | Waste heat partner / share (EnEfG). | District heating (Stadtwerke) |
| `Onsite_Generation` | Optional | Gas turbines, BESS, PV, PPA ... | BESS + PPA |
| `Investment_EUR_m` | Optional | Announced capex (EUR m). | 1200 |
| `Confidence` | **Required** | How reliable is this row? | Reported (press / trade media) |
| `Source_1` | **Required** | URL or document reference. | https://example.com/press-release |
| `Source_2` | Optional | Second source. |  |
| `Source_3` | Optional | Third source. |  |
| `Last_Verified` | **Required** | Date the row was last checked. Stale rows (>6 months) get flagged. | 2026-11-01 |
| `Updated_By` | Recommended | Initials. | JK |
| `Include_in_Deck` | **Required** | Yes = appears on the slide table. | Yes |
| `Comments` | Optional | Free text (internal). |  |

## Allowed values

**Status:** Operating · Under construction · Development - advanced · Development - early · Announced · Paused · Cancelled

**Construction_Stage:** n/a · Site clearing · Groundbreaking · Shell & core · Fit-out · Commissioning · Completed

**DC_Type:** Hyperscale (self-build) · Hyperscale (leased / BTS) · Colocation - wholesale · Colocation - retail · AI / HPC · Enterprise · Government · University / Research · Edge / Regional

**Owner_Type:** Operator owns · End user owns · Real estate developer · Investor / Infrastructure fund · Joint venture · Unknown

**Owner_Country:** Germany · United States · United Kingdom · France · Netherlands · Sweden · Norway · Japan · Australia · Singapore · Other EU · Other · Unknown

**Bundesland:** Baden-Württemberg · Bayern · Berlin · Brandenburg · Bremen · Hamburg · Hessen · Mecklenburg-Vorpommern · Niedersachsen · Nordrhein-Westfalen · Rheinland-Pfalz · Saarland · Sachsen · Sachsen-Anhalt · Schleswig-Holstein · Thüringen

**Location_Precision:** Exact plot · Business park · Municipality · Approximate / estimated

**Capacity_Basis:** IT load (critical) · Grid connection · Estimated from area · Unknown

**Grid_Status:** Not requested · Requested · Reservation / Zusage · Contracted (Netzanschlussvertrag) · Energised · Unknown

**Planning_Status:** No B-Plan needed / existing · Aufstellungsbeschluss · Frühzeitige Beteiligung · Offenlage · Satzungsbeschluss (B-Plan in force) · Baugenehmigung · BImSchG permit · Unknown

**Confidence:** Confirmed (official / operator) · Reported (press / trade media) · Market intelligence (unverified) · Estimate · SAMPLE - replace

**Yes_No:** Yes · No

## clusters.csv

| Column | Meaning |
|---|---|
| `Cluster` | Region name, exactly as used in `projects.csv` |
| `Bubble_Lat`, `Bubble_Lon` | Where the region's bubble is drawn |
| `Hub_Marker` | Optional letter shown inside the bubble (e.g. `N` for a network hub) |
| `Label_Side` | `left`, `right`, `above` or `below`: where the region name is printed |
