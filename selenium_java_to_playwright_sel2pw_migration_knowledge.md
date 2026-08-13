# Selenium Java → Playwright TypeScript Migration with sel2pw + Playwright MCP

## 1. Objective

Use `sel2pw` as the deterministic migration engine for an existing Selenium Java/TestNG framework, then extend it to understand the project's custom framework abstractions:

- Page Objects
- `By` locators and wrapper methods
- Components (business-level sequences of actions)
- Component Groups (groups of components/business flows)
- RunManager / Runner
- Excel-driven test data
- Test-case/business-flow keyword mappings
- Multiple Excel sheets/tabs and datasets

Use Playwright MCP as a separate AI/browser-validation layer rather than embedding MCP into the Java-to-TypeScript converter.

Reference repositories:

- sel2pw: https://github.com/javvadivijayprasad/sel2pw
- Microsoft Playwright MCP: https://github.com/microsoft/playwright-mcp

## 2. What sel2pw already provides

The repository describes itself as a Selenium Java/TestNG → Playwright TypeScript converter using AST/rule-based transformations with optional LLM fallback.

Existing capabilities include:

- Java/Selenium project scanning
- Java AST/IR extraction
- `By` → Playwright locator mapping
- WebDriver/WebElement → Playwright API mapping
- TestNG/JUnit assertions → Playwright `expect`
- `@Test` and lifecycle conversion
- Page Object → TypeScript class
- BaseTest → fixture migration
- DataProvider handling
- testng.xml
- Actions
- JavaScript execution
- iframe handling
- alerts
- cookies
- uploads
- properties → environment configuration
- TypeScript validation
- migration review/TODO reporting
- optional LLM fallback

Important limitation: sel2pw explicitly positions its output as a migration skeleton requiring human cleanup. Complex project-specific framework/utility/reporting layers still need additional migration logic.

## 3. Core architectural decision

Do NOT create a line-by-line Selenium compatibility layer.

Avoid:

    Existing Selenium framework
        ↓
    Selenium compatibility API
        ↓
    Playwright

Instead build:

    Existing Selenium framework
        ↓
    sel2pw + custom framework adapter
        ↓
    Playwright-native TypeScript framework
        ↓
    Playwright Test
        ↓
    Playwright MCP for browser inspection/AI validation

The target should preserve business abstractions while replacing the Selenium execution layer.

## 4. Existing framework → target framework

### Existing

    Excel/Test Data
          ↓
    RunManager
          ↓
    Business Flow
          ↓
    Component Group
          ↓
    Component
          ↓
    Page Object
          ↓
    Selenium WebDriver

### Target

    Excel/Test Data
          ↓
    Typed Test Data / Data Provider
          ↓
    Playwright Test
          ↓
    Flow
          ↓
    Component
          ↓
    Page Object
          ↓
    Playwright Locator

Suggested target folders:

    playwright-framework/
    ├── playwright.config.ts
    ├── tests/
    │   ├── customer/
    │   ├── orders/
    │   └── payments/
    ├── pages/
    │   ├── LoginPage.ts
    │   ├── CustomerPage.ts
    │   └── OrderPage.ts
    ├── components/
    │   ├── LoginComponent.ts
    │   ├── CustomerComponent.ts
    │   └── OrderComponent.ts
    ├── flows/
    │   ├── CustomerCreationFlow.ts
    │   └── OrderCreationFlow.ts
    ├── fixtures/
    │   └── test.fixture.ts
    ├── data/
    │   ├── excelReader.ts
    │   ├── testDataLoader.ts
    │   └── testCaseRepository.ts
    ├── types/
    │   └── testData.types.ts
    ├── utils/
    └── config/

## 5. Main extension required in sel2pw

The most important addition is a configurable Framework Adapter plus a unified Intermediate Representation (IR).

Proposed pipeline:

    Java Project
         ↓
    Scanner
         ↓
    Java AST / IR
         ↓
    Framework Analyzer
         ↓
    Unified Framework IR
         ↓
    ┌───────────────┬─────────────────┬─────────────────┐
    │ Selenium      │ Framework       │ Data/Runner     │
    │ Transformer   │ Transformer     │ Transformer     │
    └───────────────┴─────────────────┴─────────────────┘
         ↓
    Emitters
         ↓
    Playwright TypeScript

The framework analyzer should classify classes/methods as:

- PAGE
- COMPONENT
- COMPONENT_GROUP
- BUSINESS_FLOW
- RUN_MANAGER
- TEST_DATA
- UTILITY
- BASE_TEST
- UNKNOWN

## 6. Proposed IR

Example:

    interface FrameworkClassIR {
        file: string;
        className: string;
        type:
            | 'PAGE'
            | 'COMPONENT'
            | 'COMPONENT_GROUP'
            | 'BUSINESS_FLOW'
            | 'RUN_MANAGER'
            | 'TEST_DATA'
            | 'UTILITY'
            | 'BASE_TEST'
            | 'UNKNOWN';
        methods: MethodIR[];
        dependencies: string[];
    }

The IR should preserve:

- source file
- package/module
- class type
- methods
- method calls
- dependencies
- Selenium locators
- page references
- component references
- test-data references
- business-flow relationships
- warnings/unsupported constructs
- source-to-target traceability

## 7. New transformers

Extend the existing transformer layer with:

    src/transformers/
        locatorMapper.ts
        apiMap.ts
        assertionMap.ts
        bodyTransformer.ts

        componentMapper.ts
        componentGroupMapper.ts
        businessFlowMapper.ts
        testDataMapper.ts
        runManagerMapper.ts
        frameworkClassifier.ts

### Component transformer

A Java Component should become a TypeScript Component and remain business-oriented.

Example:

    Java:
    CustomerComponent.createCustomer()

    Target:
    CustomerComponent.createCustomer()

The implementation should call Playwright Page Object methods rather than direct browser APIs whenever possible.

## 8. Component Group → Flow

A Component Group should normally become a `Flow` in the target framework.

Example:

    PurchaseComponentGroup
        ↓
    PurchaseFlow

A flow can orchestrate:

- LoginComponent
- CustomerComponent
- OrderComponent
- PaymentComponent

Example target:

    export class PurchaseFlow {
        constructor(
            private readonly customer: CustomerComponent,
            private readonly order: OrderComponent,
            private readonly payment: PaymentComponent
        ) {}

        async execute(data: PurchaseData): Promise<void> {
            await this.customer.create(data);
            await this.order.create(data);
            await this.payment.pay(data);
        }
    }

Do not flatten flows into tests.

## 9. Page Object conversion

Convert Selenium Page Objects into Playwright-native Page Objects.

Prefer:

- `Locator`
- `getByRole`
- `getByLabel`
- `getByText`
- semantic locators
- Playwright auto-waiting

Avoid blindly translating every Selenium `By` into a raw locator.

Example:

    Selenium:
    By.id("login")

    Possible Playwright:
    page.getByRole('button', { name: 'Login' })

or, when semantic information is unavailable:

    page.locator('#login')

Do not carry Selenium explicit-wait patterns into Playwright unnecessarily.

## 10. RunManager conversion

Do not reproduce RunManager as a custom test runner.

Map its responsibilities to:

- Playwright Test
- fixtures
- projects
- configuration
- hooks
- retries
- workers
- reporting
- environment configuration

Keep only business-specific orchestration that Playwright Test does not provide.

Suggested mapping:

    RunManager
        ↓
    Playwright configuration + fixtures + data orchestration

## 11. Excel/test-data migration

The Excel layer needs a dedicated adapter.

Suggested flow:

    Excel
      ↓
    Excel Reader
      ↓
    TestCase Model
      ↓
    Typed Test Data
      ↓
    Playwright Test

Do not make every test directly parse Excel.

Create typed interfaces, for example:

    interface CustomerTestData {
        username: string;
        password: string;
        customerName: string;
        address: string;
    }

Support:

- multiple worksheets
- test-case IDs
- datasets
- keyword/action rows
- business-flow references
- environment-specific data
- optional data inheritance/overrides if the current framework has them

Preserve test-case IDs and traceability.

## 12. Configurable framework mapping

Do not hardcode one company's framework assumptions.

Add a framework configuration such as:

    framework:
      name: custom-framework

      classifications:
        page:
          packages:
            - pages
            - pageobjects

        component:
          packages:
            - components

        componentGroup:
          packages:
            - componentgroups

        businessFlow:
          packages:
            - flows

        runManager:
          classes:
            - RunManager
            - Runner

        testData:
          packages:
            - testdata

    mappings:
      Component:
        target: Component

      ComponentGroup:
        target: Flow

      RunManager:
        target: PlaywrightFixture

      ExcelData:
        target: TestDataProvider

Support class-name, package, annotation, inheritance and configurable pattern matching where possible.

## 13. Plugin/adapter architecture

Prefer:

    sel2pw core
      ├── Selenium Java adapter
      ├── TestNG adapter
      ├── generic POM adapter
      └── custom framework adapters

The custom framework should be an adapter/plugin/configuration, not a permanent fork of core conversion logic.

## 14. Playwright MCP integration

Keep Playwright MCP separate from sel2pw.

Use sel2pw for deterministic source-code migration.

Use Playwright MCP for:

- browser exploration
- DOM/accessibility inspection
- locator discovery
- validating generated locators
- investigating failures
- AI-assisted repair
- behavior validation

Recommended pipeline:

    Selenium Java
        ↓
    sel2pw
        ↓
    Playwright TypeScript
        ↓
    TypeScript compile
        ↓
    Playwright tests
        ↓
    Failure?
        ↓
    Playwright MCP + AI agent
        ↓
    inspect application/browser
        ↓
    propose repair
        ↓
    validate
        ↓
    human approval / commit

Do not make MCP a mandatory dependency of the deterministic converter.

## 15. AI usage strategy

Do not use:

    Java → LLM → TypeScript

as the primary conversion mechanism.

Prefer:

    Java
      ↓
    AST
      ↓
    deterministic transformations
      ↓
    TypeScript
      ↓
    tsc
      ↓
    Playwright execution
      ↓
    LLM only for unknown/failing cases
      ↓
    validate again

This gives repeatability and makes migration results auditable.

## 16. Validation and parity

Every migration should produce:

- generated project
- TypeScript compile report
- Playwright execution report
- migration review report
- unsupported construct list
- source-to-target mapping
- manual TODO list
- conversion statistics
- test-case coverage
- component/flow coverage
- data-sheet coverage

Add migration gates:

1. No unclassified Java files.
2. No silently dropped methods.
3. No silently dropped test cases.
4. No silently dropped Excel rows/datasets.
5. TypeScript must compile before test execution.
6. Playwright tests must execute for migrated scenarios.
7. Every warning must have an explicit classification.
8. Business-flow order must be preserved.
9. Generated code must be formatted.
10. All changes must be traceable to source files.

## 17. Recommended implementation phases

### Phase 1 — Baseline

- Clone/fork sel2pw.
- Run it against a representative subset of the Selenium project.
- Capture `analyze` output.
- Capture generated TypeScript.
- Run `tsc --noEmit`.
- Run a small Playwright test set.
- Record conversion failures.

### Phase 2 — Framework discovery

Build a framework inventory:

    Java class
    → role
    → dependencies
    → methods
    → Selenium usage
    → data usage
    → business-flow usage

Create representative fixtures for:

- Page
- Component
- Component Group
- Business Flow
- RunManager
- Excel test data
- one complete test case

### Phase 3 — Framework IR

Implement:

- framework classifier
- FrameworkClassIR
- dependency graph
- business-flow graph
- test-data references

### Phase 4 — Transformers

Implement:

- Component transformer
- Component Group → Flow transformer
- Business Flow transformer
- Test Data transformer
- RunManager → fixture/config transformer

### Phase 5 — Emitters

Add templates/output for:

- components
- flows
- fixtures
- data
- test specs
- configuration

### Phase 6 — Validation

Add:

- TypeScript compiler validation
- Playwright execution
- migration parity report
- source-to-target traceability
- no-drop checks

### Phase 7 — MCP/AI

Add Playwright MCP as an external development/repair workflow.

Use an AI agent to:

- inspect failing tests
- inspect the live application
- compare generated locators with actual UI
- propose corrections
- run tests again
- generate a review summary

### Phase 8 — Scale

Run on:

- 10 representative tests
- 50 tests
- 100 tests
- full project

Compare:

- conversion accuracy
- compile failures
- runtime failures
- business-flow parity
- manual effort
- unsupported constructs

## 18. Best implementation principle

Preserve business intent, not Selenium implementation details.

The desired result is not:

    Selenium Java code rewritten in TypeScript syntax.

The desired result is:

    Existing business automation model
        ↓
    Playwright-native TypeScript automation model

Business concepts such as Components, Flows, test-case IDs and data mappings should survive the migration.

Selenium-specific concepts such as WebDriver, WebElement, explicit waits and `By` should disappear wherever Playwright provides a better native abstraction.

## 19. Recommended implementation prompt

Use the following prompt with a coding agent that has access to the sel2pw repository and your Selenium project.

---

# MASTER IMPLEMENTATION PROMPT

You are a senior TypeScript compiler/tooling engineer, Java AST engineer, Playwright framework architect, and test-automation migration specialist.

Your task is to extend the existing `sel2pw` repository into a production-grade migration tool for a custom Selenium Java automation framework.

## Source project architecture

The source Selenium project has:

1. Page Object classes
   - Selenium `By` locators
   - WebElement fields
   - wrapper methods
   - page-level actions

2. Component classes
   - business-level keywords
   - sequences of Page Object actions
   - reusable business operations

3. Component Group classes
   - groups of Components
   - larger business workflows

4. RunManager / Runner
   - test execution configuration
   - test-case metadata
   - business-flow orchestration

5. Excel-based test data
   - multiple worksheets
   - multiple datasets
   - test-case IDs
   - keyword/business-flow definitions
   - data mapped to test cases

6. Test cases
   - reference business flows/keywords
   - consume Excel datasets

## Target architecture

Convert to:

- Playwright
- TypeScript
- Playwright Test
- Page Objects
- Components
- Flows
- Fixtures
- typed test data
- Playwright-native configuration

Use Playwright MCP separately for browser exploration, locator validation and AI-assisted repair.

## Critical requirement

Do NOT implement a line-by-line Selenium compatibility layer.

Do NOT simply translate Java syntax into TypeScript.

Preserve business semantics while replacing Selenium implementation details with Playwright-native concepts.

## First step — repository inspection

Before changing code:

1. Inspect the complete sel2pw repository.
2. Read README.md.
3. Read architecture documentation.
4. Inspect `src/types.ts`.
5. Inspect scanner implementation.
6. Inspect parser/AST extraction.
7. Inspect every existing transformer.
8. Inspect every emitter.
9. Inspect templates.
10. Inspect tests and examples.
11. Identify current extension points.
12. Identify what can be reused without modification.
13. Identify where the new framework adapter should integrate.

Do not start coding before producing a concise architecture assessment.

## Second step — analyze the source project

Analyze the provided Selenium Java project.

Classify every Java file as one of:

- PAGE
- COMPONENT
- COMPONENT_GROUP
- BUSINESS_FLOW
- RUN_MANAGER
- TEST_DATA
- TEST
- BASE_TEST
- UTILITY
- UNKNOWN

Classification must use configurable rules based on:

- package
- class name
- annotations
- inheritance
- interfaces
- method signatures
- dependencies
- known framework APIs

Do not silently classify ambiguous files.

Produce an analysis report.

## Third step — create a unified IR

Extend sel2pw's IR with framework-specific structures.

At minimum support:

- FrameworkClassIR
- ComponentIR
- ComponentGroupIR
- BusinessFlowIR
- RunManagerIR
- TestDataIR
- KeywordIR
- DependencyIR
- TestCaseIR

Preserve source locations and source-to-target traceability.

The IR must represent relationships between:

Test → Business Flow → Component Group → Component → Page Object → Locator

and:

Test Case → Dataset → Excel Worksheet → Test Data

## Fourth step — implement framework configuration

Create a configurable framework-adapter configuration.

Support:

- package patterns
- class-name patterns
- annotations
- inheritance
- interface patterns
- explicit mappings

Do not hardcode assumptions about one company/project.

## Fifth step — implement transformations

Implement:

### Page Object

Java Selenium POM → Playwright TypeScript POM.

Prefer:

- `Locator`
- `getByRole`
- `getByLabel`
- `getByText`

Use CSS/XPath only when semantic locators cannot be inferred safely.

Do not preserve unnecessary Selenium waits.

### Component

Java Component → TypeScript Component.

Preserve:

- class
- public business methods
- method parameters
- component dependencies
- page dependencies
- business sequence

Convert browser interactions to async Playwright operations.

### Component Group

Java Component Group → TypeScript Flow.

Preserve component execution order.

Do not flatten flows into test specs.

### Business Flow

Preserve business-flow semantics and references.

### RunManager

Do not recreate a custom test runner.

Map runner responsibilities to:

- Playwright Test
- fixtures
- configuration
- projects
- hooks
- retries
- workers
- reporting

### Test Data

Convert Excel references into a typed data layer.

Support:

- multiple worksheets
- test-case IDs
- datasets
- keyword rows
- business-flow references
- environment-specific data

Do not make every test parse Excel directly.

## Sixth step — output structure

Generate:

pages/
components/
flows/
fixtures/
data/
types/
utils/
tests/

Generate:

- playwright.config.ts
- package.json
- tsconfig.json
- fixture files
- typed data models
- migration report

## Seventh step — validation

After generation:

1. Run formatting.
2. Run TypeScript compilation.
3. Run static checks.
4. Run Playwright tests.
5. Capture failures.
6. Generate migration report.
7. Generate TODO/manual-review items.

Never hide errors.

Every unsupported source construct must produce a warning with:

- source file
- class
- method
- source line if available
- reason
- suggested migration
- severity

## Eighth step — no-drop guarantees

Implement validation that detects:

- Java files with no output classification
- tests with no target test
- methods with no target
- components with no target
- flows with no target
- test-data sheets with no mapping
- datasets with no mapping
- keywords with no mapping

Nothing should disappear silently.

## Ninth step — Playwright MCP

Do not embed the MCP server into the core converter.

Instead produce an integration workflow/documentation for an external Playwright MCP-enabled coding agent.

The agent should use MCP to:

- inspect the application
- inspect accessibility structure
- validate generated locators
- investigate runtime failures
- suggest locator improvements
- validate behavior after migration

Do not allow MCP/LLM to replace deterministic AST transformation.

## Tenth step — AI fallback

Use LLM only for constructs that deterministic rules cannot safely transform.

Pipeline:

Java AST
→ deterministic transform
→ TypeScript
→ tsc
→ Playwright test
→ failure/unknown
→ LLM suggestion
→ validation
→ human approval

Every LLM-generated change must be marked as AI-assisted in the migration report.

## Testing strategy

Create fixtures for:

1. simple Page Object
2. complex Page Object
3. Component
4. Component Group
5. Business Flow
6. RunManager
7. Excel data
8. multiple Excel sheets
9. multiple datasets
10. complete end-to-end test case

Each fixture must have:

- source Java
- expected IR
- expected TypeScript
- assertions
- compile validation

Add regression tests for every newly supported construct.

## Design constraints

- TypeScript strict mode
- no `any` unless unavoidable and documented
- async/await for Playwright
- Playwright Test as runner
- deterministic transformations first
- configurable framework adapter
- no silent data loss
- no silent test loss
- preserve business-flow order
- preserve test-case IDs
- preserve source traceability
- produce actionable migration reports

## Deliverables

Implement the feature completely.

Produce:

1. framework analyzer
2. framework IR
3. framework adapter/configuration
4. component transformer
5. component-group/flow transformer
6. business-flow transformer
7. test-data transformer
8. RunManager/fixture transformer
9. emitters/templates
10. validation
11. migration report
12. regression tests
13. documentation
14. Playwright MCP integration guide
15. example migration

Do not stop after creating a design.

Implement incrementally and keep the repository buildable after each phase.

At the end report:

- files changed
- files added
- architecture decisions
- supported constructs
- unsupported constructs
- test results
- TypeScript compile result
- migration coverage
- known limitations
- recommended next steps

Do not claim a feature works unless there is a test proving it.

---

## 20. Final recommendation

Start by running the existing `sel2pw` against a **small representative slice** of your actual framework, not the entire repository.

The current repository already has a clean scanner → parser/IR → transformers → emitters pipeline and an explicit review/validation model, so extending those seams is the lowest-risk approach. citeturn0view0

Then add the custom framework adapter **before** attempting the full migration.

For MCP, keep the official Microsoft server as a separate browser/AI capability. citeturn0view1

The key success metric should be **business-flow parity**, not "how many Java lines were converted."

