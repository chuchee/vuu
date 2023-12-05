import { Button } from "@salt-ds/core";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import {
  layoutFromJson,
  LayoutJSON,
  View,
  useLayoutProviderDispatch,
} from "@finos/vuu-layout";

import "./ContextPanel.css";

const classBase = "vuuContextPanel";

export interface ContextPanelProps {
  [key: string]: unknown;
  className?: string;
  content?: LayoutJSON;
  expanded?: boolean;
  overlay?: boolean;
}

export const ContextPanel = ({
  className: classNameProp,
  expanded = false,
  content: contentProp,
  overlay = false,
  title,
}: ContextPanelProps) => {
  const dispatchLayoutAction = useLayoutProviderDispatch();
  // const [contentJson, setContentJson] = useState(contentProp);
  const handleClose = useCallback(() => {
    dispatchLayoutAction({
      path: "#context-panel",
      propName: "expanded",
      propValue: false,
      type: "set-prop",
    });
  }, [dispatchLayoutAction]);
  // TODO look up content using context

  const className = cx(classBase, classNameProp, {
    [`${classBase}-expanded`]: expanded,
    [`${classBase}-inline`]: overlay !== true,
    [`${classBase}-overlay`]: overlay,
  });

  const content = useMemo(
    () =>
      contentProp && expanded ? layoutFromJson(contentProp, "context-0") : null,
    [contentProp, expanded]
  );

  return (
    <div
      className={cx(classBase, className, {
        [`${classBase}-expanded`]: expanded,
      })}
    >
      <View className={`${classBase}-inner`} header={false} id="context-panel">
        <div className={`${classBase}-header`}>
          <h2 className={`${classBase}-title`}>{title}</h2>
          <Button
            className={`${classBase}-close`}
            data-icon="close"
            onClick={handleClose}
            variant="secondary"
          />
        </div>
        <div className={`${classBase}-content`}>{content}</div>
      </View>
    </div>
  );
};
