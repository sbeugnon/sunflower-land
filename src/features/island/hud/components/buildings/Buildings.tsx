import React, { useContext, useState } from "react";
import { useActor } from "@xstate/react";
import { Box } from "components/ui/Box";
import { Context } from "features/game/GameProvider";
import { getKeys } from "features/game/types/craftables";
import { ITEM_DETAILS } from "features/game/types/images";
import { BUILDINGS, BuildingName } from "features/game/types/buildings";
import { Button } from "components/ui/Button";
import { SplitScreenView } from "components/ui/SplitScreenView";
import { CraftingRequirements } from "components/ui/layouts/CraftingRequirements";

import lock from "assets/skills/lock.png";

import Decimal from "decimal.js-light";
import { SUNNYSIDE } from "assets/sunnyside";
import { Label } from "components/ui/Label";
import { ITEM_ICONS } from "../inventory/Chest";
import { getBumpkinLevel } from "features/game/lib/level";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

interface Props {
  onClose: () => void;
}

const VALID_BUILDINGS: BuildingName[] = [
  "Kitchen" as BuildingName,
  "Water Well" as BuildingName,
  "Bakery" as BuildingName,
  "Hen House" as BuildingName,
  "Deli" as BuildingName,
  "Smoothie Shack" as BuildingName,
  "Toolshed" as BuildingName,
  "Warehouse" as BuildingName,
  "Compost Bin" as BuildingName,
  "Turbo Composter" as BuildingName,
  "Premium Composter" as BuildingName,
].sort(
  (a, b) => BUILDINGS()[a][0].unlocksAtLevel - BUILDINGS()[b][0].unlocksAtLevel
);

export const Buildings: React.FC<Props> = ({ onClose }) => {
  const [selectedName, setSelectedName] = useState<BuildingName>("Water Well");
  const { gameService } = useContext(Context);
  const [
    {
      context: { state },
    },
  ] = useActor(gameService);
  const { inventory } = state;
  const { t } = useAppTranslation();
  const buildingBlueprints = BUILDINGS()[selectedName];
  const buildingUnlockLevels = buildingBlueprints.map(
    ({ unlocksAtLevel }) => unlocksAtLevel
  );
  const buildingsInInventory = inventory[selectedName] || new Decimal(0);
  // Some buildings have multiple blueprints, so we need to check if the next blueprint is available else fallback to the first one
  const nextBlueprintIndex = buildingBlueprints[buildingsInInventory.toNumber()]
    ? buildingsInInventory.toNumber()
    : 0;
  const numOfBuildingAllowed = buildingUnlockLevels.filter(
    (level) => getBumpkinLevel(state.bumpkin?.experience ?? 0) >= level
  ).length;
  const nextLockedLevel = buildingUnlockLevels.find(
    (level) => getBumpkinLevel(state.bumpkin?.experience ?? 0) < level
  );

  const isAlreadyCrafted = inventory[selectedName]?.greaterThanOrEqualTo(
    BUILDINGS()[selectedName].length
  );

  const ingredients = buildingBlueprints[0].ingredients.reduce(
    (acc, ingredient) => ({
      ...acc,
      [ingredient.item]: new Decimal(ingredient.amount),
    }),
    {}
  );

  const { sfl } = buildingBlueprints[nextBlueprintIndex];

  const lessIngredients = () =>
    buildingBlueprints[nextBlueprintIndex].ingredients.some((ingredient) =>
      ingredient.amount?.greaterThan(inventory[ingredient.item] || 0)
    );

  const craft = () => {
    gameService.send("LANDSCAPE", {
      action: "building.constructed",
      placeable: selectedName,
      requirements: {
        sfl,
        ingredients,
      },
    });

    onClose();
  };

  const landLocked = () => {
    return (
      <div className="flex flex-col w-full justify-center">
        <div className="flex items-center justify-center ">
          <Label
            type="danger"
            icon={SUNNYSIDE.icons.player}
          >{`Level ${nextLockedLevel} required`}</Label>
        </div>
      </div>
    );
  };

  const action = () => {
    const hasMaxNumberOfBuildings =
      buildingsInInventory.gte(numOfBuildingAllowed);
    // Hasn't unlocked the first
    if (nextLockedLevel && hasMaxNumberOfBuildings) return landLocked();

    if (isAlreadyCrafted) {
      return <p className="text-xxs text-center mb-1">{t("alr.crafted")}</p>;
    }

    return (
      <Button
        disabled={lessIngredients() || state.balance.lt(sfl)}
        onClick={craft}
      >
        {t("build")}
      </Button>
    );
  };

  const FILTERED_BUILDINGS = () => {
    return getKeys(BUILDINGS());
  };

  return (
    <SplitScreenView
      panel={
        <CraftingRequirements
          gameState={state}
          details={{
            item: selectedName,
          }}
          requirements={{
            sfl,
            resources: buildingBlueprints[
              nextBlueprintIndex
            ].ingredients.reduce(
              (acc, ingredient) => ({
                ...acc,
                [ingredient.item]: new Decimal(ingredient.amount),
              }),
              {}
            ),
          }}
          actionView={action()}
        />
      }
      content={
        <>
          {VALID_BUILDINGS.map((name: BuildingName) => {
            const blueprints = BUILDINGS()[name];
            const inventoryCount = inventory[name] || new Decimal(0);
            const nextIndex = blueprints[inventoryCount.toNumber()]
              ? inventoryCount.toNumber()
              : 0;
            const isLocked =
              getBumpkinLevel(state.bumpkin?.experience ?? 0) <
              BUILDINGS()[name][nextIndex].unlocksAtLevel;

            let secondaryIcon = undefined;
            if (isLocked) {
              secondaryIcon = lock;
            }

            if (
              inventory[name]?.greaterThanOrEqualTo(BUILDINGS()[name].length)
            ) {
              secondaryIcon = SUNNYSIDE.icons.confirm;
            }

            return (
              <Box
                isSelected={selectedName === name}
                key={name}
                onClick={() => setSelectedName(name)}
                image={ITEM_ICONS[name] ?? ITEM_DETAILS[name].image}
                secondaryImage={secondaryIcon}
                showOverlay={isLocked}
              />
            );
          })}
        </>
      }
    />
  );
};
