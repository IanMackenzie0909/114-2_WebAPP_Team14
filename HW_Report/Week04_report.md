Week 4 Practice report
===

In-class Practice
---

**Basic JavaScript Syntax**  

> - `document.querySelectorAll(selector)`
>   - **Purpose**: Select all DOM elements matching a CSS selector (e.g. `.tl-entry`).
>   - **Usage**: Retrieve every timeline entry card so we can attach scroll-reveal behavior to each one.  
>
> - `document.addEventListener('DOMContentLoaded', callback)`
>   - **Purpose**: Execute code only after the HTML document has been fully parsed.
>   - **Usage**: Wrap all page-initialization logic inside this event to avoid referencing elements that haven't been created yet.  
>
> - `element.classList.add(className)`
>   - **Purpose**: Add a CSS class to a DOM element at runtime.
>   - **Usage**: When a timeline entry scrolls into view, add the `show` class to trigger a CSS fade-in transition.  
>
> - `Array.forEach(callback)`
>   - **Purpose**: Iterate through every element in a NodeList / Array.
>   - **Usage**: Loop over all `.tl-entry` elements to register each one with the IntersectionObserver.
>
> - `console.log()`
>   - **Purpose**: Print debug information to the browser's developer console.
>   - **Usage**: Log page load confirmations and the number of observed entries for debugging.

Additional Content
---

**Advanced JavaScript — IntersectionObserver API**  

> - `new IntersectionObserver(callback, options)`
>   - **Purpose**: Asynchronously observe visibility changes of target elements relative to the viewport, without the performance cost of continuously listening to scroll events.
>   - **Usage**: We create an observer with `{ threshold: 0.15 }`, meaning the callback fires once 15 % of the element is visible.
>
>   ```js
>   const io = new IntersectionObserver((items) => {
>       items.forEach((item) => {
>           if (item.isIntersecting) {
>               item.target.classList.add('show');
>           }
>       });
>   }, { threshold: 0.15 });
>   ```
>
>   - **`item.isIntersecting`**: A boolean that is `true` when the element enters the viewport.
>   - **`item.target`**: References the actual DOM element being observed.
>   - **`io.observe(entry)`**: Registers an element for observation.
>
> - **Why IntersectionObserver over Scroll Events?**
>   - Traditional `window.addEventListener('scroll', ...)` fires on every pixel scrolled, which can degrade performance.
>   - IntersectionObserver is natively optimized by the browser — it only triggers when elements cross the specified visibility threshold, resulting in smoother animations with less CPU usage.

**Arrow Functions (`=>`)**  

> - **Purpose**: A concise syntax for writing anonymous functions, commonly used in callbacks.
> - **Usage**: Used throughout as event listener and observer callbacks, e.g. `(items) => { ... }`.

Contribution
---

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | 各分頁 Html and css 結構與設計 |
| 呂羿樺 | 50% | Refine design, reconstruct project structure and report writing |
