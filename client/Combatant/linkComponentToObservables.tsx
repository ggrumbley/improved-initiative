import * as ko from "knockout";
import { noop } from "lodash";

export function linkComponentToObservables(component: React.Component) {
  let observableSubscription = ko.observable().subscribe(noop);
  const oldComponentDidMount = component.componentDidMount || noop;
  component.componentDidMount = () => {
    observableSubscription = ko
      .computed(() => component.render())
      .subscribe(() => component.forceUpdate());
    oldComponentDidMount();
  };
  const oldComponentWillUnmount = component.componentWillUnmount || noop;
  component.componentWillUnmount = () => {
    observableSubscription.dispose();
    oldComponentWillUnmount();
  };
}
