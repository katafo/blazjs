import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("User")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
