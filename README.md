# Solenya Animation

Solenya animation coordinates element animations in response to DOM changes.

For context, this package provides 1 of 3 techniques you can use to animate in Solenya:

1) CSS animation - this is great for animating an element when the previous position of the element or any of the element's siblings is irrelevant.
2) Web Animations API - this is great for sequencing animations on an element. The Web animations API is supported by most browsers and you can use the `web-animations-js` shim for the remaining browsers such as Internet Explorer. You can also use third party animation packages.
3) Measure/flip animations - this is what this package does - it lets you automatically animate the positions of elements in response to DOM changes. It does this using the measure/flip technique.

# transitionChildren

The `transitionChildren` function lets you gracefully transition the positions of a group of children as each enter and leave the DOM, or move relative to each other.

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

export interface TransitionChildrenProps {    
    /** Whether the children are oriented horiontally or vertically */
    orientation?: Orientation

    /** The duration of the animation */
    duration?: number,

    /** The direction, either "forwards" or "backwards" - useful for carousel animations */
    direction?: Direction

    /** Whether to reset the scroll position to zero. Useful for full page animations. */
    scrollToStart?: boolean,

    /** The animation threshold in pixels. Defaults to 5. */
    animationThreshold?: number
}
```

Children will automatically move to their new positions if necessary.

By default, entering children will expand, while exiting children will collapse. If `direction` is set, then entering and exiting children will slide in the direction specified.

Set `scrollToStart` to `true` when animating an element that represents a new page, as it's undesirable when the sliding stops to be scrolled part way into the new page.