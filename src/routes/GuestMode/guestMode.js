import Accordian from "components/Accordian";
import Button from "components/Button";
import TimerCircle from "components/TimerCircle";
import Toast from "components/Toast";
import { useAudio, useTimer } from "hooks";
import update from "immutability-helper";
import { getUsernameFromToken, readTokens } from "lib/tokenFunctions";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Helmet from "react-helmet";
import { FaPlay, FaPlus, FaStop } from "react-icons/fa";
import { IoCloseCircleSharp } from "react-icons/io5";
import { Navigate } from "react-router-dom";
import { preDefinedSets } from "./config";

const GuestMode = () => {
  const [sets, setSets] = useState([]);
  const [input, setInput] = useState("1-1");
  const [automaticPlay, setAutomaticPlay] = useState(true);
  const [timerId, setId] = useState(null);
  const [currentSet, setCurrentSet] = useState(null);
  const [playing, toggle] = useAudio();

  const { startTimer, status, clearTimer, timeRemaining, setStatus } =
    useTimer();

  const toggleAudio = () => {
    if (!playing) toggle();
  };

  useEffect(() => {
    if (sets.length > 1 && status === "OFF") {
      if (automaticPlay) {
        let temp = sets[1];
        removePomodoro(sets[0].id);
        let { id } = startTimer(temp.duration * 60, toggleAudio);
        setCurrentSet(temp);
        setId(id);
      } else {
        removePomodoro(sets[0].id);
        setId(null);
        setCurrentSet(null);
      }
    } else if (sets.length === 1 && status === "OFF") {
      setSets([]);
      setId(null);
      setCurrentSet(null);
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [status]);

  const moveSets = useCallback(
    (dragIndex, hoverIndex) => {
      const dragSet = sets[dragIndex];
      setSets(
        update(sets, {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragSet],
          ],
        })
      );
    },
    [sets]
  );
  
  const renderSet = (set, index) => {
    return (
      <Set
        key={set.id}
        index={index}
        id={set.id}
        text={set.duration}
        moveSet={moveSets}
      />
    );
  };

  if (readTokens().ok) {
    return <Navigate to={`/cp/${getUsernameFromToken()}`} />;
  }

  // Event Handlers

  const addSet = (e) => {
    e.preventDefault();

    if (!input) {
      Toast("Please select a valid set.", "danger");
      return;
    }

    const thisSets = input.split("-");
    thisSets.forEach((duration, _) =>
      setSets((sets) => [
        ...sets,
        { id: Math.round(Math.random() * 500), duration },
      ])
    );
  };

  const removePomodoro = (id) => {
    if (!id || id === null) {
      return;
    }
    if (sets.length === 0) {
      return;
    }
    if (status === "ON" && id === currentSet.id) {
      clearInterval(timerId);
      clearTimer(timerId);
      setStatus("OFF");
      setId(null);
      return;
    }

    setSets((sets) => sets.filter((set) => set.id !== id));
  };

  const startTimerMiddleware = () => {
    if (sets.length === 0) {
      Toast("Please add a Pomodoro.", "danger");
      return;
    }
    if (timerId !== null) {
      Toast("Another timer running", "danger");
      return;
    }

    let res = sets[0].duration * 60;

    let { id } = startTimer(res, toggleAudio);
    setId(id);
    setCurrentSet(sets[0]);
  };

  // Components

  const Set = ({ id, text, index, moveSet }) => {
    const ref = useRef(null);
    const [{ handlerId }, drop] = useDrop({
      accept: "set",
      collect(monitor) {
        return {
          handlerId: monitor.getHandlerId(),
        };
      },
      canDrop() {
        if (id === currentSet.id) return false;
        return true;
      },
      hover(item, monitor) {
        if (!ref.current) {
          return;
        }
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) {
          return;
        }
        // Determine rectangle on screen
        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        // Get vertical middle
        const hoverMiddleY =
          (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        // Determine mouse position
        const clientOffset = monitor.getClientOffset();
        // Get pixels to the top
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return;
        }
        // Dragging upwards
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return;
        }

        moveSet(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });
    const [{ isDragging }, drag] = useDrag({
      type: "set",
      item: () => {
        return { id, index };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag() {
        if (id === currentSet.id) return false;
        return true;
      },
    });
    drag(drop(ref));

    return (
      <li
        ref={ref}
        className={`px-7 py-4 font-medium rounded-md items-center flex justify-center text-center relative shadow-md cursor-pointer ${
          isDragging ? "opacity-20" : "opacity-100"
        } ${id && id === currentSet?.id ? "bg-neutral-100" : "bg-white"}`}
        data-handler-id={handlerId}
      >
        {text} min
        <div
          className="absolute text-black cursor-pointer top-1 right-1"
          onClick={() => removePomodoro(id)}
        >
          <IoCloseCircleSharp />
        </div>
      </li>
    );
  };

  const renderControls = (
    <div className="bg-white p-4 rounded-md shadow">
      <Accordian prompt="Timer Controls" defaultState={true}>
        <form className="flex overflow-hidden text-white gap-1 bg-transparent focus:outline-none">
          <select
            className="flex-1 bg-gray-100 p-3 text-neutral-900 rounded-md"
            name="select-set"
            value={input}
            id="select-set"
            defaultValue="1-1"
            onChange={(e) => {
              setInput(e.target.value);
            }}
          >
            {preDefinedSets.map((set) => (
              <option className="p-1 block" value={set.value} key={set.value}>
                {set.text}
              </option>
            ))}
          </select>
          <Button onClick={addSet} variant="primary">
            <FaPlus />
          </Button>
        </form>
        <div className="flex flex-wrap justify-center gap-1 mt-3">
          <Button onClick={startTimerMiddleware} variant="green">
            <FaPlay />
            Start
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              clearTimer(timerId);
            }}
            variant="red"
          >
            <FaStop />
            Clear
          </Button>
        </div>
        <div className="mt-5 flex items-center justify-center">
          <input
            onChange={() => setAutomaticPlay(!automaticPlay)}
            type="checkbox"
            checked={automaticPlay}
            name="automaticPlay"
            id="automaticPlay"
            className="mr-2 w-5 h-5 cursor-pointer"
          />
          <label htmlFor="automaticPlay" className="text-sm font-medium">
            Start Next Timer Automatically
          </label>
        </div>
      </Accordian>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Guest Mode – Centralize</title>
      </Helmet>
      <div className="container min-h-80vh py-16 flex flex-wrap items-center justify-center gap-10">
        <TimerCircle
          className="lg:max-w-lg m-0 w-full"
          timeLeft={timeRemaining.total}
          countdown={{ mins: timeRemaining.mins, secs: timeRemaining.secs }}
          totalTime={currentSet?.duration * 60}
        />
        <div className="lg:max-w-sm w-full flex flex-col gap-10 justify-center items-center">
          <DndProvider backend={HTML5Backend}>
            <ul className="w-max max-w-full gap-1 justify-center flex flex-wrap">
              {sets.length > 0 ? (
                sets.map((set, i) => renderSet(set, i))
              ) : (
                <p>You have added no sets yet.</p>
              )}
            </ul>
          </DndProvider>

          <div>{renderControls}</div>
        </div>
      </div>
    </>
  );
};

export default GuestMode;
