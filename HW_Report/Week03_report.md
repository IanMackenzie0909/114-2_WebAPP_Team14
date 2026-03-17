Week 3 Practice report
===

題目：Ninjago 歷史年表 *(暫定)*
---

We decided to build a Chinese version of Ninjago Wiki. *Preparation:*

| Member | Contribution |
| :--: | :-- |
| 顏伯亨 | Data & Content research, Topic conception |
| 呂羿樺 | Image collection & Design brainstormimg |

---

In-class Practice
---

**Design of HTML**  

```text
1.  Navigation bar
2.  Banner Section  
3.  Timeline Section
    - 3 Main timelines:
      - Pilot Episodes
      - Rise of the Snakes
      - Legacy of the Green Ninja
    ... (to be continued)
4.  Characters Section  
    6 Characters
5.  Footer
```

> Basic syntax we use: basic structure, headings and paragraphs, navigation bar...

**CSS Design**  

```text
1. Basic syntax: external links, selectors, and properties...
2. Pseudo-Element: <.hero::before>
                   <.hero::after>
3. class structure
4. color, background, padding, margin, font-size...
```

---

Additional Content
---

**HTML**  

> - HTML cards embed image as bg.
>   - **Reasons**: to showcase each era's main scene and characters, and to decorate pages.
>   - **\<Method>**: use label ```<img>``` and give it a file link and a special **class**, so that we can modify each picture in css respectively. **\<Why?>** cuz each picture's pixels aren't totally the same, we need to adjust each of them manually to make sure the tidiness.

---

**CSS**  

> - Banner animation
>   - **Reasons**: to show each session's and movies' posters.
>   - **\<Method>**: we use ```@keyframes``` to create a dynamic visual.  

> - Interactive function: hover
>   - **Reasons**: we design this project to be user friendly. When the user hovers over the area will slightly rise, which will also be a critical design for what we are going to do next.
>   - **\<Method>**: apply transform function ```translateY,``` ```scale,``` and ```brightness``` to change the form when a mice hover over it.  

Contribution
---

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Html and css structure |
| 呂羿樺 | 50% | Refine design and report writing |
