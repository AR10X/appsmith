import {
  CONTAINER_GRID_PADDING,
  GridDefaults,
} from "constants/WidgetConstants";
import { debounce, throttle } from "lodash";
import { CanvasDraggingArenaProps } from "pages/common/CanvasArenas/CanvasDraggingArena";
import { useEffect } from "react";
import { getNearestParentCanvas } from "utils/generators";
import { useWidgetDragResize } from "utils/hooks/dragResizeHooks";
import {
  areIntersecting,
  getDropZoneOffsets,
  getResizeParamsForPartialBoundaryCollision,
  getResizeParamsForSinglePointCollision,
  getResizeParamsForFullBoundaryCollision,
  isPointInsideRect,
  noCollision,
} from "utils/WidgetPropsUtils";
import { getCanvasTopOffset } from "../utils";
import {
  useBlocksToBeDraggedOnCanvas,
  WidgetDraggingBlock,
} from "./useBlocksToBeDraggedOnCanvas";
import { useCanvasDragToScroll } from "./useCanvasDragToScroll";

export interface XYCord {
  x: number;
  y: number;
}

export const useCanvasDragging = (
  slidingArenaRef: React.RefObject<HTMLDivElement>,
  stickyCanvasRef: React.RefObject<HTMLCanvasElement>,
  {
    canExtend,
    dropDisabled,
    noPad,
    snapColumnSpace,
    snapRows,
    snapRowSpace,
    widgetId,
  }: CanvasDraggingArenaProps,
) => {
  const { devicePixelRatio: scale = 1 } = window;

  const {
    blocksToDraw,
    defaultHandlePositions,
    getSnappedXY,
    isChildOfCanvas,
    isCurrentDraggedCanvas,
    isDragging,
    isNewWidget,
    isNewWidgetInitialTargetCanvas,
    isResizing,
    occSpaces,
    onDrop,
    parentDiff,
    relativeStartPoints,
    rowRef,
    updateRows,
  } = useBlocksToBeDraggedOnCanvas({
    canExtend,
    noPad,
    snapColumnSpace,
    snapRows,
    snapRowSpace,
    widgetId,
  });

  const {
    setDraggingCanvas,
    setDraggingNewWidget,
    setDraggingState,
  } = useWidgetDragResize();

  const canScroll = useCanvasDragToScroll(
    slidingArenaRef,
    isCurrentDraggedCanvas,
    isDragging,
    snapRows,
    canExtend,
  );
  useEffect(() => {
    if (
      slidingArenaRef.current &&
      !isResizing &&
      isDragging &&
      blocksToDraw.length > 0
    ) {
      const scrollParent: Element | null = getNearestParentCanvas(
        slidingArenaRef.current,
      );
      let canvasIsDragging = false;
      let isUpdatingRows = false;
      let currentRectanglesToDraw: WidgetDraggingBlock[] = [];
      const scrollObj: any = {};

      const resetCanvasState = () => {
        if (stickyCanvasRef.current && slidingArenaRef.current) {
          const canvasCtx: any = stickyCanvasRef.current.getContext("2d");
          canvasCtx.clearRect(
            0,
            0,
            stickyCanvasRef.current.width,
            stickyCanvasRef.current.height,
          );
          slidingArenaRef.current.style.zIndex = "";
          canvasIsDragging = false;
        }
      };
      if (isDragging) {
        const startPoints = defaultHandlePositions;
        const onMouseUp = () => {
          if (isDragging && canvasIsDragging) {
            onDrop(currentRectanglesToDraw);
          }
          startPoints.top = defaultHandlePositions.top;
          startPoints.left = defaultHandlePositions.left;
          resetCanvasState();

          if (isCurrentDraggedCanvas) {
            if (isNewWidget) {
              setDraggingNewWidget(false, undefined);
            } else {
              setDraggingState({
                isDragging: false,
              });
            }
            setDraggingCanvas();
          }
        };

        const onFirstMoveOnCanvas = (e: any) => {
          if (
            !isResizing &&
            isDragging &&
            !canvasIsDragging &&
            slidingArenaRef.current
          ) {
            if (!isNewWidget) {
              startPoints.left =
                relativeStartPoints.left || defaultHandlePositions.left;
              startPoints.top =
                relativeStartPoints.top || defaultHandlePositions.top;
            }
            if (!isCurrentDraggedCanvas) {
              // we can just use canvasIsDragging but this is needed to render the relative DragLayerComponent
              setDraggingCanvas(widgetId);
            }
            canvasIsDragging = true;
            slidingArenaRef.current.style.zIndex = "2";
            onMouseMove(e);
          }
        };
        const getCollidingAreas = (block: WidgetDraggingBlock) => {
          const [left, top] = getDropZoneOffsets(
            snapColumnSpace,
            snapRowSpace,
            { x: block.left, y: block.top } as XYCord,
            { x: 0, y: 0 },
          );

          const blockRect = {
            left: left,
            top: top,
            right: left + block.columnWidth,
            bottom: top + block.rowHeight,
          };
          const collidingBlocks = occSpaces.filter((each) => {
            return areIntersecting(each, blockRect);
          });

          const processCollidingBlocks = collidingBlocks.map((each) => {
            const collidedPoints = [
              { y: each.top, x: each.left, type: "topLeft" },
              { y: each.top, x: each.right, type: "topRight" },
              { y: each.bottom, x: each.left, type: "bottomLeft" },
              { y: each.bottom, x: each.right, type: "bottomRight" },
            ].filter((eachPoint) => {
              return isPointInsideRect(eachPoint, blockRect);
            });
            if (collidedPoints.length === 0) {
              return {
                ...each,
                resizeParams: getResizeParamsForPartialBoundaryCollision(
                  each,
                  blockRect,
                ),
              };
            }
            if (collidedPoints.length === 1) {
              return {
                ...each,
                resizeParams: getResizeParamsForSinglePointCollision(
                  collidedPoints[0],
                  blockRect,
                ),
              };
            }
            if (collidedPoints.length === 2) {
              return {
                ...each,
                resizeParams: getResizeParamsForFullBoundaryCollision(
                  collidedPoints,
                  blockRect,
                ),
              };
            }
            // cannot have three colliding points.

            if (collidedPoints.length === 4) {
              return {
                ...each,
              };
            }
            return { ...each };
          });
          const resizeUpdates = processCollidingBlocks.reduce(
            (update: any, each: any) => {
              if (each && each.resizeParams) {
                update[each.resizeParams.direction] += each.resizeParams.amount;
              }
              return update;
            },
            { top: 0, bottom: 0, left: 0, right: 0 },
          );
          return { ...block, resizeUpdates };
        };
        const resizeBlockToAllowDrop = (block: WidgetDraggingBlock) => {
          const collidingAreas = getCollidingAreas(block);
          // eslint-disable-next-line no-console
          console.log(collidingAreas);
          return collidingAreas;
        };
        const onMouseMove = (e: any) => {
          if (isDragging && canvasIsDragging && slidingArenaRef.current) {
            const delta = {
              left: e.offsetX - startPoints.left - parentDiff.left,
              top: e.offsetY - startPoints.top - parentDiff.top,
            };

            const drawingBlocks = blocksToDraw.map((each) => ({
              ...each,
              left: each.left + delta.left,
              top: each.top + delta.top,
            }));
            const newRows = updateRows(drawingBlocks, rowRef.current);
            const rowDelta = newRows ? newRows - rowRef.current : 0;
            rowRef.current = newRows ? newRows : rowRef.current;
            currentRectanglesToDraw = drawingBlocks.map((each) => ({
              ...each,
              isNotColliding:
                !dropDisabled &&
                noCollision(
                  { x: each.left, y: each.top },
                  snapColumnSpace,
                  snapRowSpace,
                  { x: 0, y: 0 },
                  each.columnWidth,
                  each.rowHeight,
                  each.widgetId,
                  occSpaces,
                  rowRef.current,
                  GridDefaults.DEFAULT_GRID_COLUMNS,
                  each.detachFromLayout,
                ),
            }));
            currentRectanglesToDraw = currentRectanglesToDraw.map((each) => {
              if (each.isNotColliding) {
                return each;
              }
              return resizeBlockToAllowDrop(each);
            });
            if (rowDelta && slidingArenaRef.current) {
              isUpdatingRows = true;
              canScroll.current = false;
              renderNewRows(delta);
            } else if (!isUpdatingRows) {
              renderBlocks();
            }
            scrollObj.lastMouseMoveEvent = {
              offsetX: e.offsetX,
              offsetY: e.offsetY,
            };
            scrollObj.lastScrollTop = scrollParent?.scrollTop;
            scrollObj.lastScrollHeight = scrollParent?.scrollHeight;
          } else {
            onFirstMoveOnCanvas(e);
          }
        };
        const renderNewRows = debounce((delta) => {
          isUpdatingRows = true;
          if (slidingArenaRef.current && stickyCanvasRef.current) {
            const canvasCtx: any = stickyCanvasRef.current.getContext("2d");

            currentRectanglesToDraw = blocksToDraw.map((each) => {
              return {
                ...each,
                left: each.left + delta.left,
                top: each.top + delta.top,
                isNotColliding:
                  !dropDisabled &&
                  noCollision(
                    { x: each.left + delta.left, y: each.top + delta.top },
                    snapColumnSpace,
                    snapRowSpace,
                    { x: 0, y: 0 },
                    each.columnWidth,
                    each.rowHeight,
                    each.widgetId,
                    occSpaces,
                    rowRef.current,
                    GridDefaults.DEFAULT_GRID_COLUMNS,
                    each.detachFromLayout,
                  ),
              };
            });
            canvasCtx.save();
            canvasCtx.scale(scale, scale);
            canvasCtx.clearRect(
              0,
              0,
              stickyCanvasRef.current.width,
              stickyCanvasRef.current.height,
            );
            canvasCtx.restore();
            renderBlocks();
            canScroll.current = false;
            endRenderRows.cancel();
            endRenderRows();
          }
        });

        const endRenderRows = throttle(
          () => {
            canScroll.current = true;
          },
          50,
          {
            leading: false,
            trailing: true,
          },
        );

        const renderBlocks = () => {
          if (
            slidingArenaRef.current &&
            isCurrentDraggedCanvas &&
            canvasIsDragging &&
            stickyCanvasRef.current
          ) {
            const canvasCtx: any = stickyCanvasRef.current.getContext("2d");
            canvasCtx.save();
            canvasCtx.clearRect(
              0,
              0,
              stickyCanvasRef.current.width,
              stickyCanvasRef.current.height,
            );
            isUpdatingRows = false;
            if (canvasIsDragging) {
              currentRectanglesToDraw.forEach((each) => {
                drawBlockOnCanvas(getResizeUpdatedBlock(each));
              });
            }
            canvasCtx.restore();
          }
        };
        const getResizeUpdatedBlock = (
          blockDimensions: WidgetDraggingBlock,
        ) => {
          if (
            !blockDimensions.isNotColliding &&
            blockDimensions.resizeUpdates
          ) {
            const updates = blockDimensions.resizeUpdates;
            const updatedBlock = {
              ...blockDimensions,
              top: blockDimensions.top + updates.top * snapRowSpace,
              left: blockDimensions.left + updates.left * snapColumnSpace,
              width:
                blockDimensions.width -
                (updates.left + updates.right) * snapColumnSpace,
              height:
                blockDimensions.height -
                (updates.bottom + updates.top) * snapRowSpace,
            };
            return updatedBlock;
          }
          return blockDimensions;
        };

        const drawBlockOnCanvas = (blockDimensions: WidgetDraggingBlock) => {
          if (
            stickyCanvasRef.current &&
            slidingArenaRef.current &&
            scrollParent &&
            isCurrentDraggedCanvas &&
            canvasIsDragging
          ) {
            const canvasCtx: any = stickyCanvasRef.current.getContext("2d");
            const topOffset = getCanvasTopOffset(
              slidingArenaRef,
              stickyCanvasRef,
              canExtend,
            );
            const snappedXY = getSnappedXY(
              snapColumnSpace,
              snapRowSpace,
              {
                x: blockDimensions.left,
                y: blockDimensions.top,
              },
              {
                x: 0,
                y: 0,
              },
            );

            canvasCtx.fillStyle = `${
              blockDimensions.isNotColliding ? "rgb(104,	113,	239, 0.6)" : "red"
            }`;
            canvasCtx.fillRect(
              blockDimensions.left + (noPad ? 0 : CONTAINER_GRID_PADDING),
              blockDimensions.top -
                topOffset +
                (noPad ? 0 : CONTAINER_GRID_PADDING),
              blockDimensions.width,
              blockDimensions.height,
            );
            canvasCtx.fillStyle = `${
              blockDimensions.isNotColliding ? "rgb(233, 250, 243, 0.6)" : "red"
            }`;
            const strokeWidth = 1;
            canvasCtx.setLineDash([3]);
            canvasCtx.strokeStyle = "rgb(104,	113,	239)";
            canvasCtx.strokeRect(
              snappedXY.X + strokeWidth + (noPad ? 0 : CONTAINER_GRID_PADDING),
              snappedXY.Y -
                topOffset +
                strokeWidth +
                (noPad ? 0 : CONTAINER_GRID_PADDING),
              blockDimensions.width - strokeWidth,
              blockDimensions.height - strokeWidth,
            );
            canvasCtx.setLineDash([0]);
            canvasCtx.strokeStyle = "#d4d4d4";
            canvasCtx.strokeRect(
              blockDimensions.left + (noPad ? 0 : CONTAINER_GRID_PADDING),
              blockDimensions.top -
                topOffset +
                (noPad ? 0 : CONTAINER_GRID_PADDING),
              blockDimensions.width,
              blockDimensions.height,
            );
          }
        };
        const onScroll = () => {
          const {
            lastMouseMoveEvent,
            lastScrollHeight,
            lastScrollTop,
          } = scrollObj;
          if (
            lastMouseMoveEvent &&
            Number.isInteger(lastScrollHeight) &&
            Number.isInteger(lastScrollTop) &&
            scrollParent &&
            canScroll.current
          ) {
            const delta =
              scrollParent?.scrollHeight +
              scrollParent?.scrollTop -
              (lastScrollHeight + lastScrollTop);
            onMouseMove({
              offsetX: lastMouseMoveEvent.offsetX,
              offsetY: lastMouseMoveEvent.offsetY + delta,
            });
          }
        };
        const initializeListeners = () => {
          slidingArenaRef.current?.addEventListener(
            "mousemove",
            onMouseMove,
            false,
          );
          slidingArenaRef.current?.addEventListener(
            "mouseup",
            onMouseUp,
            false,
          );
          scrollParent?.addEventListener("scroll", onScroll, false);

          slidingArenaRef.current?.addEventListener(
            "mouseover",
            onFirstMoveOnCanvas,
            false,
          );
          slidingArenaRef.current?.addEventListener(
            "mouseout",
            resetCanvasState,
            false,
          );
          slidingArenaRef.current?.addEventListener(
            "mouseleave",
            resetCanvasState,
            false,
          );
          document.body.addEventListener("mouseup", onMouseUp, false);
          window.addEventListener("mouseup", onMouseUp, false);
        };
        const startDragging = () => {
          if (
            slidingArenaRef.current &&
            stickyCanvasRef.current &&
            scrollParent
          ) {
            const { height } = scrollParent.getBoundingClientRect();
            const { width } = slidingArenaRef.current.getBoundingClientRect();
            const canvasCtx: any = stickyCanvasRef.current.getContext("2d");
            stickyCanvasRef.current.width = width * scale;
            stickyCanvasRef.current.height = height * scale;
            canvasCtx.scale(scale, scale);
            initializeListeners();
            if (
              (isChildOfCanvas || isNewWidgetInitialTargetCanvas) &&
              slidingArenaRef.current
            ) {
              slidingArenaRef.current.style.zIndex = "2";
            }
          }
        };
        startDragging();

        return () => {
          slidingArenaRef.current?.removeEventListener(
            "mousemove",
            onMouseMove,
          );
          slidingArenaRef.current?.removeEventListener("mouseup", onMouseUp);
          scrollParent?.removeEventListener("scroll", onScroll);
          slidingArenaRef.current?.removeEventListener(
            "mouseover",
            onFirstMoveOnCanvas,
          );
          slidingArenaRef.current?.removeEventListener(
            "mouseout",
            resetCanvasState,
          );
          slidingArenaRef.current?.removeEventListener(
            "mouseleave",
            resetCanvasState,
          );
          document.body.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("mouseup", onMouseUp);
        };
      } else {
        resetCanvasState();
      }
    }
  }, [isDragging, isResizing, blocksToDraw, snapRows, canExtend]);
  return {
    showCanvas: isDragging && !isResizing,
  };
};
