let currentFiber = null;
let hookIndex = 0;
let pendingRender = false;
let rootComponent = null;
let rootContainer = null;
let currentVNodeTree = null;

function scheduleUpdate() {
  if (pendingRender) return;
  pendingRender = true;
  
  queueMicrotask(() => {
    pendingRender = false;
    if (rootComponent && rootContainer) {
      hookIndex = 0;
      currentFiber = { hooks: currentFiber?.hooks || [] }; 
      const newVNode = rootComponent();
      const rootDOMNode = rootContainer.firstChild;
      diff(currentVNodeTree, newVNode, rootContainer, rootDOMNode);
      currentVNodeTree = newVNode;
      runEffects();
    }
  });
}

export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.flat().filter(c => c != null && c !== false),
    },
    key: props?.key ?? null,
  };
}

export function createDOMNode(vNode) {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    return document.createTextNode(vNode);
  }
  if (typeof vNode.type === 'function') {
    return createDOMNode(vNode.type(vNode.props));
  }

  const dom = document.createElement(vNode.type);

  if (vNode.props) {
    Object.keys(vNode.props).forEach(name => {
      if (name === 'children' || name.startsWith('__')) return; // Ignore internal Vite elements

      if (name.toLowerCase().startsWith('on')) {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(eventType, vNode.props[name]);
      } else if (name === 'style') {
        if (typeof vNode.props.style === 'string') {
          dom.style.cssText = vNode.props.style;
        } else if (typeof vNode.props.style === 'object') {
          Object.assign(dom.style, vNode.props.style);
        }
      } else {
        dom.setAttribute(name === 'className' ? 'class' : name, vNode.props[name]);
      }
    });
  }

  if (vNode.props?.children) {
    vNode.props.children.forEach(child => dom.appendChild(createDOMNode(child)));
  }

  return dom;
}

export function render(component, container) {
  rootContainer = container;
  rootComponent = component;
  currentVNodeTree = null;
  currentFiber = { hooks: [] };
  hookIndex = 0;
  container.innerHTML = '';
  
  // Initial render
  hookIndex = 0;
  const vNode = component({});
  container.appendChild(createDOMNode(vNode));
  currentVNodeTree = vNode;
  runEffects();
}

export function diff(oldVNode, newVNode, container, domNode) {
  if (!oldVNode) {
    container.appendChild(createDOMNode(newVNode));
    return;
  }
  if (!newVNode) {
    domNode.remove();
    return;
  }

  if (oldVNode.type !== newVNode.type || typeof oldVNode !== typeof newVNode) {
    const newDOM = createDOMNode(newVNode);
    container.replaceChild(newDOM, domNode);
    return;
  }

  if (typeof oldVNode === 'string' || typeof oldVNode === 'number') {
    if (oldVNode !== newVNode) domNode.textContent = newVNode;
    return;
  }

  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  
  Object.keys(oldProps).forEach(name => {
    if (name !== 'children' && !name.startsWith('__') && !(name in newProps)) {
      if (name.toLowerCase().startsWith('on')) {
        const eventType = name.toLowerCase().substring(2);
        domNode.removeEventListener(eventType, oldProps[name]);
      } else {
        domNode.removeAttribute(name);
      }
    }
  });

  Object.keys(newProps).forEach(name => {
    if (name === 'children' || name.startsWith('__')) return;
    if (oldProps[name] !== newProps[name]) {
      if (name.toLowerCase().startsWith('on')) {
        const eventType = name.toLowerCase().substring(2);
        domNode.removeEventListener(eventType, oldProps[name]);
        domNode.addEventListener(eventType, newProps[name]);
      } else if (name === 'style') {
        domNode.style.cssText = ''; 
        if (typeof newProps.style === 'string') {
          domNode.style.cssText = newProps.style;
        } else if (typeof newProps.style === 'object') {
          Object.assign(domNode.style, newProps.style);
        }
      } else {
        domNode.setAttribute(name === 'className' ? 'class' : name, newProps[name]);
      }
    }
  });

  const oldChildren = oldProps.children || [];
  const newChildren = newProps.children || [];
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLength; i++) {
    diff(oldChildren[i], newChildren[i], domNode, domNode.childNodes[i]);
  }
}

export function useState(initialValue) {
  const index = hookIndex;
  if (!currentFiber.hooks[index]) {
    currentFiber.hooks[index] = {
      state: typeof initialValue === 'function' ? initialValue() : initialValue,
    };
  }
  const hook = currentFiber.hooks[index];
  const setState = (nextValue) => {
    const valueToSet = typeof nextValue === 'function' ? nextValue(hook.state) : nextValue;
    if (hook.state !== valueToSet) {
      hook.state = valueToSet;
      scheduleUpdate();
    }
  };
  hookIndex++;
  return [hook.state, setState];
}

let effectsQueue = [];
export function useEffect(callback, deps) {
  const index = hookIndex;
  const oldHook = currentFiber.hooks[index];
  const hasChanged = oldHook ? !deps.every((dep, i) => dep === oldHook.deps[i]) : true;

  if (!deps || hasChanged) {
    effectsQueue.push({ callback, index, oldCleanup: oldHook?.cleanup });
  }

  currentFiber.hooks[index] = { deps, cleanup: oldHook?.cleanup };
  hookIndex++;
}

function runEffects() {
  effectsQueue.forEach(effect => {
    if (effect.oldCleanup) effect.oldCleanup();
    const cleanup = effect.callback();
    if (typeof cleanup === 'function') {
      currentFiber.hooks[effect.index].cleanup = cleanup;
    }
  });
  effectsQueue = [];
}
