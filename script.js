
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: []
        }
    };
}



function createElement(type, props, ...children) {

    return {
        type,

        props: {
            ...(props || {}),

            children: children
                .flat()
                .filter(child =>
                    child !== null &&
                    child !== false &&
                    child !== true
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


function updateProps(
    dom,
    oldProps = {},
    newProps = {}
) {

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

            dom.className = newProps[name];

        }

        else if (name === "value") {

            dom.value = newProps[name];

        }

        else if (name === "checked") {

            dom.checked = newProps[name];

        }

        else {

            dom.setAttribute(
                name,
                newProps[name]
            );

        }

    });

}


function createDOM(vNode) {

    if (!vNode) {
        return document.createTextNode("");
    }

    if (
        vNode.type ===
        "TEXT_ELEMENT"
    ) {

        return document.createTextNode(
            vNode.props.nodeValue
        );

    }

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


let rootContainer = null;
let currentVNode = null;



function render(
    vNode,
    container
) {

    currentVNode = vNode;
    rootContainer = container;

    container.innerHTML = "";

    container.appendChild(
        createDOM(vNode)
    );
}



const MiniReact = {

    createElement,
    render

};

const h =
    MiniReact.createElement;

function changed(oldVNode, newVNode) {

    return (
        typeof oldVNode !== typeof newVNode ||

        (
            oldVNode &&
            newVNode &&
            oldVNode.type !== newVNode.type
        ) ||

        (
            oldVNode?.type === "TEXT_ELEMENT" &&
            newVNode?.type === "TEXT_ELEMENT" &&
            oldVNode.props.nodeValue !==
            newVNode.props.nodeValue
        )
    );
}


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


function reconcile(
    parent,
    oldVNode,
    newVNode,
    index = 0
) {

    const existingDOM =
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

        if (existingDOM) {

            parent.removeChild(
                existingDOM
            );

        }

        return;
    }

    /* REPLACE */

    if (
        changed(
            oldVNode,
            newVNode
        )
    ) {

        parent.replaceChild(
            createDOM(newVNode),
            existingDOM
        );

        return;
    }

    /* TEXT NODE */

    if (
        oldVNode.type ===
        "TEXT_ELEMENT"
    ) {

        if (
            oldVNode.props.nodeValue !==
            newVNode.props.nodeValue
        ) {

            existingDOM.nodeValue =
                newVNode.props.nodeValue;

        }

        return;
    }


    if (
        typeof newVNode.type ===
        "function"
    ) {

        const oldComponent =
            oldVNode.type(
                oldVNode.props
            );

        const newComponent =
            newVNode.type(
                newVNode.props
            );

        reconcile(
            parent,
            oldComponent,
            newComponent,
            index
        );

        return;
    }


    patchProps(
        existingDOM,
        oldVNode.props,
        newVNode.props
    );


    const oldChildren =
        oldVNode.props.children || [];

    const newChildren =
        newVNode.props.children || [];

    const max =
        Math.max(
            oldChildren.length,
            newChildren.length
        );

    for (
        let i = 0;
        i < max;
        i++
    ) {

        reconcile(
            existingDOM,
            oldChildren[i],
            newChildren[i],
            i
        );

    }

}



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


function updateApp() {

    if (!rootContainer)
        return;

    hookIndex = 0;

    rerender(
        App()
    );

}

let hooks = [];
let hookIndex = 0;



let effectHooks = [];



function useState(initialValue) {

    const currentIndex = hookIndex;

    if (hooks[currentIndex] === undefined) {

        hooks[currentIndex] = initialValue;

    }

    function setState(value) {

        if (typeof value === "function") {

            hooks[currentIndex] =
                value(hooks[currentIndex]);

        } else {

            hooks[currentIndex] = value;

        }

        queueMicrotask(() => {

            updateApp();

        });

    }

    hookIndex++;

    return [
        hooks[currentIndex],
        setState
    ];
}

function useEffect(
    callback,
    dependencies
) {

    const currentIndex =
        hookIndex;

    const previousDeps =
        effectHooks[currentIndex];

    let hasChanged = true;

    if (
        previousDeps &&
        dependencies
    ) {

        hasChanged =
            dependencies.some(
                (dep, index) =>
                    dep !== previousDeps[index]
            );

    }

    if (hasChanged) {

        queueMicrotask(() => {

            callback();

        });

        effectHooks[currentIndex] =
            dependencies;

    }

    hookIndex++;
}
/

function resetHooks() {

    hookIndex = 0;

}


function updateApp() {

    resetHooks();

    rerender(
        App()
    );

}



MiniReact.useState =
    useState;

MiniReact.useEffect =
    useEffect;


const {
    useState: useStateHook,
    useEffect: useEffectHook
} = MiniReact;

function App() {

    const [tasks, setTasks] = useStateHook(
        JSON.parse(
            localStorage.getItem("tasks")
        ) || []
    );

    const [input, setInput] =
        useStateHook("");

    const [filter, setFilter] =
        useStateHook("all");

    const [dragIndex, setDragIndex] =
        useStateHook(null);

    
    useEffectHook(() => {

        localStorage.setItem(
            "tasks",
            JSON.stringify(tasks)
        );

    }, [tasks]);

   

    function addTask() {

        if (!input.trim()) return;

        setTasks([
            ...tasks,
            {
                id: Date.now(),
                text: input,
                completed: false
            }
        ]);

        setInput("");
    }

    

    function deleteTask(id) {

        setTasks(
            tasks.filter(
                task => task.id !== id
            )
        );
    }


    function toggleTask(id) {

        setTasks(
            tasks.map(task =>

                task.id === id
                    ? {
                        ...task,
                        completed: !task.completed
                    }
                    : task

            )
        );
    }

   
    function clearCompleted() {

        setTasks(
            tasks.filter(
                task => !task.completed
            )
        );
    }

   

    const filteredTasks =
        tasks.filter(task => {

            if (filter === "active")
                return !task.completed;

            if (filter === "completed")
                return task.completed;

            return true;
        });

    function handleDragStart(index) {

        setDragIndex(index);

    }

    function handleDrop(index) {

        if (dragIndex === null)
            return;

        const updated =
            [...tasks];

        const draggedTask =
            updated.splice(
                dragIndex,
                1
            )[0];

        updated.splice(
            index,
            0,
            draggedTask
        );

        setTasks(updated);
        setDragIndex(null);
    }


    return h(
        "div",
        { className: "container" },

        /* HEADER */

        h(
            "div",
            { className: "app-title" },

            h(
                "h1",
                null,
                "🚀 Custom React Todo"
            ),

            h(
                "p",
                null,
                "Built with Virtual DOM, Hooks & Reconciliation"
            )
        ),

        /* INPUT */

        h(
            "div",
            { className: "input-section" },

            h(
                "input",
                {
                    className: "todo-input",

                    value: input,

                    placeholder:
                        "Enter a task...",

                    onInput: e =>
                        setInput(
                            e.target.value
                        )
                }
            ),

            h(
                "button",
                {
                    className: "add-btn",
                    onClick: addTask
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
                        setFilter("completed")
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
                    "No tasks found"
                )

                : filteredTasks.map(
                    (task, index) =>

                        h(
                            "div",
                            {
                                key: task.id,

                                className:
                                    task.completed
                                        ? "task completed"
                                        : "task",

                                draggable: true,

                                onDragStart: () =>
                                    handleDragStart(
                                        index
                                    ),

                                onDragOver: e =>
                                    e.preventDefault(),

                                onDrop: () =>
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
                    "footer-bar"
            },

            h(
                "div",
                {
                    className:
                        "counter"
                },

                `${tasks.filter(
                    t => !t.completed
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



document.addEventListener(
    "DOMContentLoaded",
    () => {

        const root =
            document.getElementById(
                "root"
            );

        rootContainer = root;

        render(
            App(),
            root
        );
    }
);
