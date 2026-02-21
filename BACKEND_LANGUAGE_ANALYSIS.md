# Backend Language Analysis for Nagara Spark IDE

## Current Stack

Backend is **Python (FastAPI)** with **PySpark 3.5.4**. The execution engine uses `exec()`/`eval()` for Python and `spark.sql()` for SQL, with a DAG-based topological executor, caching, and namespace isolation per node.

---

## Does the Backend NEED to Be Python to Run Python/SQL Scripts?

**No, it does not.**

- **Python scripts**: Currently using `exec()`/`eval()` in-process. But you could also execute Python via **subprocess**, **Py4J** (what PySpark itself uses), or by **embedding a Python interpreter** (e.g., GraalPython from a JVM). Any language can spawn a Python process.
- **SQL scripts**: These run through `spark.sql()`, which is just a Spark API call. Spark's native API is Java/Scala — PySpark is a thin wrapper over it. A JVM-based backend would actually be *closer* to Spark's native interface.

**However**, having the backend in Python gives one major advantage: **in-process PySpark execution with zero serialization overhead**. The SparkSession lives in the same process as the executor, so DataFrames stay as native Python objects. This is why the current architecture is simple and fast for a single-user local IDE.

---

## Disadvantages of Changing the Backend Language

| Concern | Impact |
|---------|--------|
| **PySpark integration** | Would need to either shell out to Python, use Py4J bridges, or use Spark's native Java/Scala API (different API surface) |
| **exec()/eval() simplicity** | In-process Python execution is trivially easy in Python; from Go/Java you'd need subprocess management, IPC, and output capture |
| **Rewrite effort** | ~500+ lines of executor logic, DAG resolver, caching, namespace management |
| **Two runtimes** | Would run a Go/Java backend + a Python sidecar process, adding deployment complexity |
| **PySpark user code** | Users write PySpark Python code — a Python runtime is needed regardless |
| **Ecosystem** | Python has the richest data engineering library ecosystem (pandas, numpy, etc.) |

**Bottom line**: Since users write Python code that must execute in a Python runtime, Python is always needed somewhere. The question is whether the *API/orchestration layer* should also be Python or something else.

---

## Competitor Tech Stacks

### Palantir Foundry — Java (confirmed)

- Core backend services are **Java** (handles data processing, integration, complex computations)
- **Scala** used in some big data/analytics projects
- **Go** used for certain backend services
- Foundry Transforms SDK supports both **Java and Python** for user-written pipelines
- Frontend SDKs in TypeScript

### Prophecy.io — Scala (not Go)

- Backend is a set of **microservices on Kubernetes**
- Uses **Scala** for internal services (confirmed: they wrote their own Scala GraphQL client for backend services)
- Generates **Spark code in Python or Scala** for user pipelines
- Architecture includes editor-web service, sandbox microservices (Gem Plugin + Schema Analysis)
- **Not Go** — Prophecy is deeply Scala/JVM-native, which makes sense given their tight Spark integration

---

## Language Comparison for This Use Case

| Language | Pros | Cons |
|----------|------|------|
| **Python (current)** | In-process PySpark, simple exec(), fastest to develop, same language as user code | Slower API layer, GIL limits concurrency, harder to scale multi-tenant |
| **Scala/JVM** | Native Spark API (no Py4J overhead), battle-tested at Palantir/Prophecy scale, strong typing, excellent concurrency | Steep learning curve, slower dev velocity, still needs Python subprocess for user PySpark code |
| **Go** | Fast API layer, excellent concurrency, simple deployment (single binary), great for orchestration | No Spark integration at all, must shell out to Python for everything, no ecosystem overlap |
| **TypeScript/Node** | Unified stack with frontend, fast dev velocity | Same issues as Go — no Spark integration, must subprocess everything |

---

## Recommendation

**For the current stage: stay with Python.**

1. Building a **single-user local IDE** right now — Python/FastAPI is more than adequate
2. Python is needed regardless (users write PySpark code)
3. The execution engine's simplicity (`exec()`/`eval()` in-process) is a genuine advantage
4. Rewriting gives zero user-facing value at this point

**When to consider switching**: If moving to **multi-tenant SaaS** with hundreds of concurrent users, then a **Scala/JVM orchestration layer** (like Prophecy) or a **Go API gateway** with Python worker processes would make sense. At that point the architecture would be:

```
Go/Scala API Gateway → Job Queue → Python Spark Workers (isolated per user)
```

The current Python backend would become the worker process almost as-is.

---

## Sources

- [Palantir - What programming languages does Palantir use?](https://www.designgurus.io/answers/detail/what-programming-languages-does-palantir-use)
- [Palantir Foundry - Supported Languages](https://www.palantir.com/docs/foundry/building-pipelines/supported-languages)
- [Palantir - Does Palantir use Java?](https://www.designgurus.io/answers/detail/does-palantir-use-java)
- [Prophecy Architecture](https://docs.prophecy.io/administration/architecture/)
- [ProphecyHub: Metadata re-invented with Git & GraphQL](https://medium.com/prophecy-io/prophecyhub-metadata-re-invented-with-git-graphql-for-data-engineering-277abaaa88)
- [Introducing Prophecy.io](https://www.prophecy.io/blog/introducing-prophecy-io-cloud-native-data-engineering)
