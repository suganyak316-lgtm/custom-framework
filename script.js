/* ==========================================
   TASKFLOW FRAMEWORK
   PART 1 - VIRTUAL DOM & RENDERER
========================================== */

/* ==========================================
   TEXT NODE CREATOR
========================================== */

function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: String(text),
            children: []
        }
    };
}

/* ==========================================
   CREATE ELEMENT
========================================== */

function createElement(type, props, ...children) {

    return {
        type,

        props: {
            ...(props || {}),

            children: children
                .flat()
                .filter(child =>
                    child !== null &&
                    child !== undefined &&
                    child !== false
                )
                .map(child =>

                    typeof child === "object"
                        ? child
                        : createTextElement(child)

                )
        },

        key: props?.key || null
    };
}

/* ==========================================
   SHORTHAND
========================================== */

const h = createElement;

/* ==========================================
   DOM PROPERTY MANAGEMENT
========================================== */

function updateProps(
    dom,
    oldProps = {},
    newProps = {}
) {

    /* REMOVE OLD EVENTS/ATTRIBUTES */

    Object.keys(oldProps).forEach(name => {

        if (name === "children")
            return;

        if (!(name in newProps)) {

            if (name.startsWith("on")) {

                const eventType =
                    name
                        .slice(2)
                        .toLowerCase();

                dom.removeEventListener(
                    eventType,
                    oldProps[name]
                );

            } else {

                dom.removeAttribute(name);

            }

        }

    });

    /* ADD NEW */

    Object.keys(newProps).forEach(name => {

        if (name === "children")
            return;

        if (name.startsWith("on")) {

            const eventType =
                name
                    .slice(2)
                    .toLowerCase();

            if (oldProps[name]) {

                dom.removeEventListener(
                    eventType,
                    oldProps[name]
                );

            }

            dom.addEventListener(
                eventType,
                newProps[name]
            );
        }

        else if (name === "className") {

            dom.className =
                newProps[name];

        }

        else if (name === "value") {

            dom.value =
                newProps[name];

        }

        else if (name === "checked") {

            dom.checked =
                newProps[name];

        }

        else {

            dom.setAttribute(
                name,
                newProps[name]
            );

        }

    });

}

/* ==========================================
   CREATE REAL DOM NODE
========================================== */

function createDOM(vNode) {

    if (!vNode) {

        return document.createTextNode("");

    }

    /* TEXT NODE */

    if (
        vNode.type ===
        "TEXT_ELEMENT"
    ) {

        return document.createTextNode(
            vNode.props.nodeValue
        );

    }

    /* COMPONENT */

    if (
        typeof vNode.type ===
        "function"
    ) {

        const componentVNode =
            vNode.type(vNode.props);

        return createDOM(
            componentVNode
        );

    }

    /* HTML ELEMENT */

    const dom =
        document.createElement(
            vNode.type
        );

    updateProps(
        dom,
        {},
        vNode.props
    );

    vNode.props.children.forEach(
        child => {

            dom.appendChild(
                createDOM(child)
            );

        }
    );

    return dom;
}

/* ==========================================
   ROOT STORAGE
========================================== */

let rootContainer = null;
let currentVNode = null;

/* ==========================================
   INITIAL RENDER
========================================== */

function render(
    vNode,
    container
) {

    rootContainer =
        container;

    currentVNode =
        vNode;

    container.innerHTML = "";

    container.appendChild(
        createDOM(vNode)
    );
}

/* ==========================================
   FRAMEWORK OBJECT
========================================== */

const TaskFlow = {

    createElement,
    render

};
/* ==========================================
   PART 2 - DIFF & RECONCILIATION
========================================== */

/* ==========================================
   CHECK IF NODE CHANGED
========================================== */

function nodeChanged(
    oldVNode,
    newVNode
) {

    if (
        typeof oldVNode !==
        typeof newVNode
    ) {
        return true;
    }

    if (
        oldVNode &&
        newVNode &&
        oldVNode.type !==
        newVNode.type
    ) {
        return true;
    }

    if (
        oldVNode?.type ===
        "TEXT_ELEMENT" &&
        newVNode?.type ===
        "TEXT_ELEMENT" &&
        oldVNode.props.nodeValue !==
        newVNode.props.nodeValue
    ) {
        return true;
    }

    return false;
}

/* ==========================================
   PATCH PROPERTIES
========================================== */

function patchProps(
    dom,
    oldProps,
    newProps
) {

    updateProps(
        dom,
        oldProps,
        newProps
    );

}

/* ==========================================
   RECONCILE DOM
========================================== */

function reconcile(
    parent,
    oldVNode,
    newVNode,
    index = 0
) {

    const domNode =
        parent.childNodes[index];

    /* CREATE */

    if (!oldVNode) {

        parent.appendChild(
            createDOM(newVNode)
        );

        return;
    }

    /* REMOVE */

    if (!newVNode) {

        if (domNode) {

            parent.removeChild(
                domNode
            );

        }

        return;
    }

    /* REPLACE */

    if (
        nodeChanged(
            oldVNode,
            newVNode
        )
    ) {

        parent.replaceChild(
            createDOM(newVNode),
            domNode
        );

        return;
    }

    /* TEXT NODE */

    if (
        newVNode.type ===
        "TEXT_ELEMENT"
    ) {

        if (
            oldVNode.props.nodeValue !==
            newVNode.props.nodeValue
        ) {

            domNode.nodeValue =
                newVNode.props.nodeValue;

        }

        return;
    }

    /* COMPONENT */

    if (
        typeof newVNode.type ===
        "function"
    ) {

        const oldRendered =
            oldVNode.type(
                oldVNode.props
            );

        const newRendered =
            newVNode.type(
                newVNode.props
            );

        reconcile(
            parent,
            oldRendered,
            newRendered,
            index
        );

        return;
    }

    /* UPDATE ATTRIBUTES */

    patchProps(
        domNode,
        oldVNode.props,
        newVNode.props
    );

    /* RECONCILE CHILDREN */

    const oldChildren =
        oldVNode.props.children || [];

    const newChildren =
        newVNode.props.children || [];

    const maxChildren =
        Math.max(
            oldChildren.length,
            newChildren.length
        );

    for (
        let i = 0;
        i < maxChildren;
        i++
    ) {

        reconcile(
            domNode,
            oldChildren[i],
            newChildren[i],
            i
        );

    }

}

/* ==========================================
   RE-RENDER APPLICATION
========================================== */

function rerender(
    newVNode
) {

    reconcile(
        rootContainer,
        currentVNode,
        newVNode,
        0
    );

    currentVNode =
        newVNode;

}

/* ==========================================
   APP UPDATE FUNCTION
========================================== */

function updateApplication() {

    if (!rootContainer)
        return;

    hookIndex = 0;

    rerender(
        App()
    );

}
/* ==========================================
   PART 3 - HOOKS SYSTEM
========================================== */

/* ==========================================
   HOOK STORAGE
========================================== */

let hooks = [];
let hookIndex = 0;

/* ==========================================
   EFFECT STORAGE
========================================== */

let effectStore = [];

/* ==========================================
   useState
========================================== */

function useState(initialValue) {

    const currentIndex = hookIndex;

    if (
        hooks[currentIndex] === undefined
    ) {

        hooks[currentIndex] =
            initialValue;

    }

    function setState(newValue) {

        if (
            typeof newValue ===
            "function"
        ) {

            hooks[currentIndex] =
                newValue(
                    hooks[currentIndex]
                );

        } else {

            hooks[currentIndex] =
                newValue;

        }

        queueMicrotask(() => {

            updateApplication();

        });

    }

    hookIndex++;

    return [
        hooks[currentIndex],
        setState
    ];
}

/* ==========================================
   useEffect
========================================== */

function useEffect(
    callback,
    dependencies
) {

    const currentIndex =
        hookIndex;

    const oldDependencies =
        effectStore[currentIndex];

    let hasChanged = true;

    if (
        oldDependencies &&
        dependencies
    ) {

        hasChanged =
            dependencies.some(
                (dependency, index) =>

                    dependency !==
                    oldDependencies[index]
            );

    }

    if (hasChanged) {

        queueMicrotask(() => {

            callback();

        });

        effectStore[currentIndex] =
            dependencies;

    }

    hookIndex++;
}

/* ==========================================
   RESET HOOK INDEX
========================================== */

function resetHooks() {

    hookIndex = 0;

}

/* ==========================================
   FRAMEWORK UPDATE
========================================== */

function frameworkUpdate() {

    resetHooks();

    rerender(
        App()
    );

}

/* ==========================================
   EXPORT HOOKS
========================================== */

TaskFlow.useState =
    useState;

TaskFlow.useEffect =
    useEffect;

/* ==========================================
   SHORTHANDS
========================================== */

const useStateHook =
    TaskFlow.useState;

const useEffectHook =
    TaskFlow.useEffect;

/* ==========================================
   OVERRIDE UPDATE FUNCTION
========================================== */

updateApplication =
    frameworkUpdate;
/* ==========================================
   PART 4 - TODO APPLICATION
========================================== */

function App() {

    const [tasks, setTasks] = useStateHook(
        JSON.parse(
            localStorage.getItem("taskflow_tasks")
        ) || []
    );

    const [inputValue, setInputValue] =
        useStateHook("");

    const [filter, setFilter] =
        useStateHook("all");

    const [dragIndex, setDragIndex] =
        useStateHook(null);

    /* ======================================
       SAVE TO LOCAL STORAGE
    ====================================== */

    useEffectHook(() => {

        localStorage.setItem(
            "taskflow_tasks",
            JSON.stringify(tasks)
        );

    }, [tasks]);

    /* ======================================
       ADD TASK
    ====================================== */

    function addTask() {

        if (!inputValue.trim())
            return;

        const newTask = {
            id: Date.now(),
            text: inputValue,
            completed: false
        };

        setTasks([
            ...tasks,
            newTask
        ]);

        setInputValue("");
    }

    /* ======================================
       TOGGLE TASK
    ====================================== */

    function toggleTask(id) {

        setTasks(
            tasks.map(task =>

                task.id === id
                    ? {
                        ...task,
                        completed:
                            !task.completed
                    }
                    : task
            )
        );
    }

    /* ======================================
       DELETE TASK
    ====================================== */

    function deleteTask(id) {

        setTasks(
            tasks.filter(
                task => task.id !== id
            )
        );
    }

    /* ======================================
       CLEAR COMPLETED
    ====================================== */

    function clearCompleted() {

        setTasks(
            tasks.filter(
                task => !task.completed
            )
        );
    }

    /* ======================================
       FILTER TASKS
    ====================================== */

    const filteredTasks =
        tasks.filter(task => {

            if (filter === "active")
                return !task.completed;

            if (filter === "completed")
                return task.completed;

            return true;
        });

    /* ======================================
       DRAG & DROP
    ====================================== */

    function handleDragStart(index) {

        setDragIndex(index);

    }

    function handleDrop(index) {

        if (
            dragIndex === null ||
            dragIndex === index
        ) {
            return;
        }

        const updatedTasks =
            [...tasks];

        const draggedTask =
            updatedTasks.splice(
                dragIndex,
                1
            )[0];

        updatedTasks.splice(
            index,
            0,
            draggedTask
        );

        setTasks(updatedTasks);

        setDragIndex(null);
    }

    /* ======================================
       UI
    ====================================== */

    return h(
        "div",
        { className: "container" },

        /* HEADER */

        h(
            "div",
            { className: "header" },

            h(
                "h1",
                null,
                "🚀 TaskFlow Framework"
            ),

            h(
                "p",
                null,
                "Virtual DOM • Hooks • Reconciliation"
            )
        ),

        /* INPUT */

        h(
            "div",
            { className: "input-section" },

            h(
                "input",
                {
                    className:
                        "todo-input",

                    placeholder:
                        "Enter a task...",

                    value:
                        inputValue,

                    onInput: e =>
                        setInputValue(
                            e.target.value
                        )
                }
            ),

            h(
                "button",
                {
                    className:
                        "add-btn",

                    onClick:
                        addTask
                },

                "Add Task"
            )
        ),

        /* FILTERS */

        h(
            "div",
            { className: "filters" },

            h(
                "button",
                {
                    className:
                        filter === "all"
                            ? "filter-btn active"
                            : "filter-btn",

                    onClick: () =>
                        setFilter("all")
                },

                "All"
            ),

            h(
                "button",
                {
                    className:
                        filter === "active"
                            ? "filter-btn active"
                            : "filter-btn",

                    onClick: () =>
                        setFilter("active")
                },

                "Active"
            ),

            h(
                "button",
                {
                    className:
                        filter === "completed"
                            ? "filter-btn active"
                            : "filter-btn",

                    onClick: () =>
                        setFilter(
                            "completed"
                        )
                },

                "Completed"
            )
        ),

        /* TASK LIST */

        h(
            "div",
            { className: "task-list" },

            filteredTasks.length === 0

                ? h(
                    "div",
                    {
                        className:
                            "empty-state"
                    },

                    "No tasks available"
                )

                : filteredTasks.map(
                    (task, index) =>

                        h(
                            "div",
                            {
                                key:
                                    task.id,

                                className:
                                    task.completed
                                        ? "task completed"
                                        : "task",

                                draggable:
                                    true,

                                onDragStart:
                                    () =>
                                        handleDragStart(
                                            index
                                        ),

                                onDragOver:
                                    e =>
                                        e.preventDefault(),

                                onDrop:
                                    () =>
                                        handleDrop(
                                            index
                                        )
                            },

                            h(
                                "div",
                                {
                                    className:
                                        "task-left"
                                },

                                h(
                                    "input",
                                    {
                                        type:
                                            "checkbox",

                                        className:
                                            "task-checkbox",

                                        checked:
                                            task.completed,

                                        onChange:
                                            () =>
                                                toggleTask(
                                                    task.id
                                                )
                                    }
                                ),

                                h(
                                    "span",
                                    null,
                                    task.text
                                )
                            ),

                            h(
                                "button",
                                {
                                    className:
                                        "delete-btn",

                                    onClick:
                                        () =>
                                            deleteTask(
                                                task.id
                                            )
                                },

                                "Delete"
                            )
                        )
                )
        ),

        /* FOOTER */

        h(
            "div",
            {
                className:
                    "footer"
            },

            h(
                "div",
                {
                    className:
                        "counter"
                },

                `${tasks.filter(
                    task =>
                        !task.completed
                ).length} task(s) left`
            ),

            h(
                "button",
                {
                    className:
                        "clear-btn",

                    onClick:
                        clearCompleted
                },

                "Clear Completed"
            )
        )
    );
}

/* ==========================================
   APPLICATION START
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const root =
            document.getElementById(
                "root"
            );

        rootContainer =
            root;

        render(
            App(),
            root
        );
    }
);
