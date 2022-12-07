import { EventEntity, UserEntity } from "../types";
import {
  CosmosEvent,
} from "@subql/types-cosmos";
import { Attribute } from "@cosmjs/stargate/build/logs";

const defaultResponse = {
  action: "",
  from: "",
  to: "",
  amount: ""
}

export async function handleEvent(event: CosmosEvent): Promise<void> {
  const attr = event.event.attributes;
  const data = await parseAttributes(attr);
  const eventEntity = EventEntity.create({
    id: data.from,
    from: data.action,
    to: data.to
  })

  await eventEntity.save();
  if(data.action!=="transfer"&&data.action!=="transfer_from"&&data.action!=="mint") return;
  if(data.to === "juno1jkxqwxazm93nd7mgkavr46k8fyadpmlk4snf2r8kn7dn3jdw8a2sgzxupc") {
    let treasury = await UserEntity.get(data.to);
    if(treasury === undefined) {
      treasury = UserEntity.create({
        id: data.to,
        inAmount: BigInt(data.amount),
        outAmount: BigInt(0),
        nonceIn: 1,
        nonceOut: 0
      })
      await treasury.save();
      return;
    }
    treasury.inAmount = treasury.inAmount + BigInt(data.amount);
    treasury.nonceIn += 1;
    await treasury.save();
    return;
  }
  if(data.from === "juno1jkxqwxazm93nd7mgkavr46k8fyadpmlk4snf2r8kn7dn3jdw8a2sgzxupc") {
    let treasury = await UserEntity.get(data.from);
    if(treasury !== undefined) {
      treasury.outAmount = treasury.outAmount - BigInt(data.amount);
      treasury.nonceOut = treasury.nonceOut + 1;
      await treasury.save();
    }
    let staker = await UserEntity.get(data.to);
    if(staker === undefined) {
      staker = UserEntity.create({
        id: data.to,
        inAmount: BigInt(data.amount),
        outAmount: BigInt(0),
        nonceIn: 1,
        nonceOut: 0,
      });
      await staker.save();
      return;
    }
    staker.inAmount = staker.inAmount + BigInt(data.amount);
    staker.nonceIn += 1;
    await staker.save();
    return;
  }
}
const parseAttributes = async (
  attr: readonly Attribute[],
) => {
  let data = defaultResponse;

  attr.map(({ key, value }) => {
    let obj = {};
    obj =  { [key]: value };
    data = { ...data, ...obj };
  });

  return data;
};