import styles from "./Starfield.module.css";

export default function Starfield() {
  return (
    <>
      {/* Animated starfield */}
      <div className={`${styles.stars} anim-starfield`} aria-hidden="true" />
      {/* Gradient fade at bottom */}
      <div className={styles.fade} aria-hidden="true" />
    </>
  );
}
