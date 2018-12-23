# Solenya Animation

Solenya animation coordinates element animations in response to DOM changes.

For context, this package provides 1 of 3 techniques you can use to animate in Solenya:

1) CSS animation - this is great for animating an element when the previous bounds of the element or any of the element's siblings is irrelevant.
2) Web Animations API - this is great for sequencing animations on an element. The Web animations API is supported by most browsers and you can use the `web-animations-js` shim for the remaining browsers such as Internet Explorer. You can also use third party animation packages.
3) Measure/flip animations - this is what this package does - it lets you automatically animate the position and size of elements in response to DOM changes. It does this based on the measure/flip technique.

# transitionChildren

The `transitionChildren` function lets you gracefully transition the position and size of each child element as its updated, enters, or leaves the DOM. Use it to build lists where children move around or grow or shrink in response to DOM changes.

It's used as follows:

```typescript
export class AnimateShuffle extends Component {
  @transient items = range(1, 101)

  view() {
    return div(
      button ({ onclick: () => this.shuffle() }, "shuffle"),
      div (transitionChildren(), this.items.map(n =>
        div ({ key: n }, n)))
    )
  }

  shuffle() {
    this.update(() => this.items = shuffle(this.items))
  }
}
```
Each child **must have a unique key** relative to its siblings. When in doubt, the virtual DOM thinks: Same key? Same element. Different key? Different element. So the key instructs the DOM to honor your exact intent when adding, removing, and updating elements.

The properties of `transitionChildren` are:

```typescript
export type Orientation = "horizontal"|"vertical"
export type Direction = "forwards"|"backwards"
export type AnimationKind = "fade"|"slide"|"scale"

export interface TransitionChildrenProps {    

    /** The kind of animation - "fade" | "slide" | "scale". Defaults to "slide" if direction is specified, else "scale". */
    kind: AnimationKind

    /** Whether the children are oriented horiontally or vertically. Defaults to "vertical" */
    orientation: Orientation

    /** The duration of the animation */
    duration: number,

    /** Either "forwards" or "backwards" */
    direction: Direction

    /** Whether to reset the scroll position to zero. Useful for full page animations. */
    scrollToStart: boolean,

    /** The animation threshold in pixels. Defaults to 5. */
    animationThreshold: number

    /** Whether width and height changes should be animated. Defaults to false. */
    isSizeAnimated: boolean
}
```

Children will automatically move to their new positions if necessary.

There's three types of animation `kind`, that determines what happens to *entering* and *leaving* elements:

* `slide` - slide in and out
* `scale` - expand and collapse
* `fade` - fade in and out

If `kind` is not specified, then it defaults to `slide` if `direction` is specified, else `scale`.

`slide` is useful for carousel style animations on static lists. `scale` is useful for animating dynamic lists where elements may be randomly inserted or removed.

Note you can use `transitionChildren` in the case where there's only 1 child at a time - this is quite a common scenario.

Set `scrollToStart` to `true` when animating an element that represents a new page, as it's undesirable when the sliding stops to be scrolled part way into the new page.